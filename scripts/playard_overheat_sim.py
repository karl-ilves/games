#!/usr/bin/env python3
"""
Playard Cluster Overheat Simulation Tool
----------------------------------------
Käivitab ülekuumenemise simulatsiooni määratud serveril:
1. Ülekuumenenud serveril (nt Server 2) jääb punane LED-tuli (PWR) PÜSIVALT PÕLEMA terveks määratud ajaks.
2. Server 1 (192.168.1.10) 3.5mm helipesast mängib tugevdatud (valjem) tuletõrjeauto häiresireen: server_fire_car_alarm.wav loopina.
3. Simulatsiooni lõppedes taastatakse serveri LED normaalsele vilkumisele/olekule.
"""

import sys
import time
import subprocess
import threading

S1_HOST = "192.168.1.10"
S2_HOST = "192.168.1.6"
USER = "karl"
PASS = "t2103"

def run_ssh(host, cmd, timeout=30):
    expect_script = f"""
    set timeout {timeout}
    spawn ssh -o StrictHostKeyChecking=no {USER}@{host} "{cmd}"
    expect {{
        "password:" {{
            send "{PASS}\\r"
            exp_continue
        }}
        eof
    }}
    """
    return subprocess.run(["expect", "-c", expect_script], capture_output=True, text=True)

def activate_red_led_persistent(target_host, duration_sec):
    print(f"🔴 [LED] Süütan punase PWR LED-tule PÜSIVALT serveril {target_host} ({duration_sec} sek)...")
    # Tell Server 2 playard_led_daemon via OVERHEAT_TEST_FILE to keep solid RED LED
    ts_cmd = f"python3 -c \\\"import time; print(time.time() + {duration_sec})\\\" > /tmp/playard_led_overheat_test"
    run_ssh(target_host, ts_cmd, timeout=5)
    
    # Also write directly to sysfs to guarantee immediate solid red light
    sysfs_cmd = f'echo {PASS} | sudo -S sh -c "echo none > /sys/class/leds/PWR/trigger && echo 1 > /sys/class/leds/PWR/brightness && echo 0 > /sys/class/leds/ACT/brightness"'
    run_ssh(target_host, sysfs_cmd, timeout=5)

    time.sleep(duration_sec)
    print(f"🟢 [LED] Simulatsiooni aeg läbi, luban taastada normaalse režiimi.")

def play_s1_fire_car_alarm_loud(duration_sec):
    print(f"🚨 [ALARM] Mängin VALJUT tuletõrjeauto häiresireeni Server 1 ({S1_HOST}) 3.5mm pesast {duration_sec} sek...")
    start_time = time.time()
    
    # Set maximum output on Server 1
    init_cmd = "amixer -c 0 sset PCM 100% unmute; amixer -c 0 cset numid=1 400 2>/dev/null"
    run_ssh(S1_HOST, init_cmd, timeout=5)
    
    while time.time() - start_time < duration_sec:
        play_cmd = "aplay -D plughw:0,0 /tmp/server_fire_car_alarm.wav"
        run_ssh(S1_HOST, play_cmd, timeout=12)

def main():
    target = sys.argv[1] if len(sys.argv) > 1 else "s.2"
    duration = int(sys.argv[2]) if len(sys.argv) > 2 else 20
    
    target_ip = S2_HOST if target in ["s.2", "s2", "server2", "192.168.1.6"] else S1_HOST
    print(f"🔥 Käivitan {duration} sek ülekuumenemise simulatsiooni!")
    print(f"🔥 Ülekuumenev server: {target} ({target_ip}) -> Punane PWR LED püsib SEES {duration}s!")
    print(f"🔥 Valjem häirealarm: Server 1 ({S1_HOST}) 3.5mm kõlarist (server_fire_car_alarm.wav loop)!")

    t_led = threading.Thread(target=activate_red_led_persistent, args=(target_ip, duration))
    t_alarm = threading.Thread(target=play_s1_fire_car_alarm_loud, args=(duration,))

    t_led.start()
    t_alarm.start()

    t_led.join()
    t_alarm.join()
    print("✅ Ülekuumenemise test edukalt lõppenud!")

if __name__ == "__main__":
    main()

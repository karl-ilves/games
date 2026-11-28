#!/usr/bin/env python3
"""
Playard Cluster Overheat Simulation Tool
----------------------------------------
Käivitab ülekuumenemise simulatsiooni määratud serveril:
1. Ülekuumenenud serveril jääb punane LED-tuli (PWR) püsivalt põlema määratud ajaks (nt 20s).
2. Server 1 (192.168.1.10) 3.5mm helipesast mängib tuletõrjeauto häiresireen: server_fire_car_alarm.wav korduvalt (loop), kuni aeg saab täis.
3. Simulatsiooni lõppedes taastatakse LED normaalsele olekule.
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

def activate_red_led(target_host, duration_sec):
    print(f"🔴 [LED] Süütan punase PWR LED-tule püsivalt serveril {target_host} ({duration_sec} sek)...")
    cmd = f'echo {PASS} | sudo -S sh -c "echo none > /sys/class/leds/PWR/trigger && echo 1 > /sys/class/leds/PWR/brightness && sleep {duration_sec} && echo default-on > /sys/class/leds/PWR/trigger"'
    run_ssh(target_host, cmd, timeout=duration_sec + 10)
    print(f"🟢 [LED] Serveri {target_host} LED taastatud normaalsele olekule.")

def play_s1_fire_car_alarm(duration_sec):
    print(f"🚨 [ALARM] Mängin server_fire_car_alarm.wav Server 1 ({S1_HOST}) kõlarist {duration_sec} sek...")
    start_time = time.time()
    # Ensure audio setup
    init_cmd = "amixer -c 0 sset PCM 100% unmute"
    run_ssh(S1_HOST, init_cmd, timeout=5)
    
    while time.time() - start_time < duration_sec:
        # Play fire car alarm wav
        play_cmd = "aplay -D plughw:0,0 /tmp/server_fire_car_alarm.wav"
        run_ssh(S1_HOST, play_cmd, timeout=12)

def main():
    target = sys.argv[1] if len(sys.argv) > 1 else "s.2"
    duration = int(sys.argv[2]) if len(sys.argv) > 2 else 20
    
    target_ip = S2_HOST if target in ["s.2", "s2", "server2", "192.168.1.6"] else S1_HOST
    print(f"🔥 Käivitan {duration} sek ülekuumenemise simulatsiooni!")
    print(f"🔥 Ülekuumenev server: {target} ({target_ip}) - Punane tuli PÕLEB {duration}s!")
    print(f"🔥 Häiresireen: Server 1 ({S1_HOST}) 3.5mm kõlarist (server_fire_car_alarm.wav)!")

    t_led = threading.Thread(target=activate_red_led, args=(target_ip, duration))
    t_alarm = threading.Thread(target=play_s1_fire_car_alarm, args=(duration,))

    t_led.start()
    t_alarm.start()

    t_led.join()
    t_alarm.join()
    print("✅ 20s Ülekuumenemise simulatsioon edukalt lõppenud!")

if __name__ == "__main__":
    main()

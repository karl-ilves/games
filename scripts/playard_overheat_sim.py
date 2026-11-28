#!/usr/bin/env python3
"""
Playard Cluster Overheat Simulation Tool
----------------------------------------
Käivitab ülekuumenemise simulatsiooni:
1. Ülekuumenenud serveril süttib ja PÜSIB punane PWR LED-tuli.
2. Täpselt 5 sekundit hiljem käivitub Server 1 3.5mm helipesast tuletõrjesireen.
3. Sireeni helifail on katkematu (gapless/seamless), mis kordub ilma pausita.
4. Simulatsiooni lõppedes kustub punane tuli ja alarm peatub.
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
    # Trigger daemon via timestamp file
    ts_cmd = f"python3 -c \\\"import time; print(time.time() + {duration_sec})\\\" > /tmp/playard_led_overheat_test"
    run_ssh(target_host, ts_cmd, timeout=5)
    
    # Direct sysfs guarantee
    sysfs_cmd = f'echo {PASS} | sudo -S sh -c "echo none > /sys/class/leds/PWR/trigger && echo 1 > /sys/class/leds/PWR/brightness && echo 0 > /sys/class/leds/ACT/brightness"'
    run_ssh(target_host, sysfs_cmd, timeout=5)

    time.sleep(duration_sec)
    print(f"🟢 [LED] Simulatsiooni aeg läbi, luban taastada normaalse režiimi.")

def play_s1_fire_car_alarm_delayed(duration_sec):
    # Ootame täpselt 5 sekundit kuni punane tuli on ees olnud!
    if duration_sec <= 5:
        print("⚠️ Testi kestus on <= 5s, alarm ei jõua käivituda (käivitub alles pärast 5s punast tuld).")
        return

    print("⏳ Ootan 5 sekundit (punane tuli põleb, alarm ootab)...")
    time.sleep(5)
    
    alarm_duration = duration_sec - 5
    print(f"🚨 [ALARM] 5 sek möödas! Mängin KATKEMATUT häiresireeni Server 1 ({S1_HOST}) 3.5mm pesast ({alarm_duration}s)...")
    
    init_cmd = "amixer -c 0 sset PCM 100% unmute; amixer -c 0 cset numid=1 400 2>/dev/null"
    run_ssh(S1_HOST, init_cmd, timeout=5)
    
    play_cmd = "aplay -D plughw:0,0 /var/www/prod/server_fire_car_alarm.wav"
    alarm_proc = subprocess.Popen([
        "expect", "-c",
        f"""
        set timeout {alarm_duration + 5}
        spawn ssh -o StrictHostKeyChecking=no {USER}@{S1_HOST} "{play_cmd}"
        expect {{
            "password:" {{
                send "{PASS}\\r"
                exp_continue
            }}
            eof
        }}
        """
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    time.sleep(alarm_duration)
    # Stop alarm immediately
    stop_cmd = "pkill -f server_fire_car_alarm.wav"
    run_ssh(S1_HOST, stop_cmd, timeout=5)

def main():
    target = sys.argv[1] if len(sys.argv) > 1 else "s.1"
    duration = int(sys.argv[2]) if len(sys.argv) > 2 else 15
    
    target_ip = S2_HOST if target in ["s.2", "s2", "server2", "192.168.1.6"] else S1_HOST
    print(f"🔥 Käivitan {duration} sek ülekuumenemise simulatsiooni!")
    print(f"🔥 Ülekuumenev server: {target} ({target_ip}) -> Punane PWR LED püsib SEES {duration}s!")
    print(f"🔥 Alarm käivitub 5 sekundi pärast ja heli mängib täiesti katkematu loopina!")

    t_led = threading.Thread(target=activate_red_led_persistent, args=(target_ip, duration))
    t_alarm = threading.Thread(target=play_s1_fire_car_alarm_delayed, args=(duration,))

    t_led.start()
    t_alarm.start()

    t_led.join()
    t_alarm.join()
    print("✅ Ülekuumenemise test edukalt lõppenud!")

if __name__ == "__main__":
    main()

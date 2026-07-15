import paramiko
import sys

def run_cmd(cmd):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect('65.21.196.49', username='root', password='Omsairam@4522!!')
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode()
    err = stderr.read().decode()
    client.close()
    return out, err

if __name__ == '__main__':
    cmd = sys.argv[1]
    out, err = run_cmd(cmd)
    print("STDOUT:\n" + out)
    if err:
        print("STDERR:\n" + err)

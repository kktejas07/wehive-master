"""Run a single command on the deploy host. See deploy_ssh_common.py for env vars.

Usage: DEPLOY_HOST=... DEPLOY_SSH_KEY=~/.ssh/id_ed25519 python ssh_deploy.py "<command>"
"""
import sys

from deploy_ssh_common import connect


def run_cmd(cmd):
    client = connect()
    try:
        _stdin, stdout, stderr = client.exec_command(cmd)
        return stdout.read().decode(), stderr.read().decode()
    finally:
        client.close()


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit('usage: ssh_deploy.py "<command>"')
    out, err = run_cmd(sys.argv[1])
    print("STDOUT:\n" + out)
    if err:
        print("STDERR:\n" + err)

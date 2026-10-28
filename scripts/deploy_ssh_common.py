"""Shared SSH helper for the ad-hoc deploy scripts (ssh_deploy.py, sync_*.py).

Configuration comes from the environment -- nothing secret lives in the repo:

  DEPLOY_HOST        (required) server hostname or IP
  DEPLOY_USER        (optional) SSH user, default "deploy"
  DEPLOY_PORT        (optional) SSH port, default 22
  DEPLOY_SSH_KEY     (preferred) path to a private key file
  DEPLOY_PASSWORD    (fallback) password auth, only used if no key is set
  DEPLOY_KNOWN_HOSTS (optional) known_hosts file, default ~/.ssh/known_hosts

The host key MUST already be present in known_hosts (e.g. run
`ssh-keyscan -H "$DEPLOY_HOST" >> ~/.ssh/known_hosts` once and verify the
fingerprint). Unknown hosts are rejected.
"""
import os
import sys

import paramiko

REPO_ROOT = os.path.dirname(os.path.abspath(__file__))


def _require(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        sys.exit(f"Missing required environment variable: {name}")
    return value


def connect() -> paramiko.SSHClient:
    host = _require("DEPLOY_HOST")
    user = os.environ.get("DEPLOY_USER", "deploy")
    port = int(os.environ.get("DEPLOY_PORT", "22"))
    key_path = os.environ.get("DEPLOY_SSH_KEY", "").strip()
    password = os.environ.get("DEPLOY_PASSWORD", "")
    known_hosts = os.path.expanduser(
        os.environ.get("DEPLOY_KNOWN_HOSTS", "~/.ssh/known_hosts")
    )

    client = paramiko.SSHClient()
    client.load_system_host_keys()
    if os.path.exists(known_hosts):
        client.load_host_keys(known_hosts)
    client.set_missing_host_key_policy(paramiko.RejectPolicy())

    kwargs = {"hostname": host, "port": port, "username": user}
    if key_path:
        kwargs["key_filename"] = os.path.expanduser(key_path)
        kwargs["look_for_keys"] = False
    elif password:
        kwargs["password"] = password
        kwargs["look_for_keys"] = False
        kwargs["allow_agent"] = False
    # else: fall back to ssh-agent / default keys in ~/.ssh

    client.connect(**kwargs)
    return client


def upload(files, remote_root: str) -> None:
    """Upload repo-relative paths to remote_root/<same relative path>."""
    client = connect()
    try:
        sftp = client.open_sftp()
        for rel in files:
            local = os.path.join(REPO_ROOT, rel)
            remote = remote_root.rstrip("/") + "/" + rel
            sftp.put(local, remote)
            print(f"uploaded {rel}")
        sftp.close()
    finally:
        client.close()

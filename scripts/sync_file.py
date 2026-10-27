"""Upload backend files (repo-relative paths) to the deploy host.

Usage: python sync_file.py backend/routes_agents_ai.py [more files...]
Env: see deploy_ssh_common.py, plus DEPLOY_BACKEND_ROOT (remote checkout root,
e.g. /etc/dokploy/applications/<app>/code).
"""
import os
import sys

from deploy_ssh_common import upload

if __name__ == '__main__':
    files = sys.argv[1:] or ['backend/routes_agents_ai.py']
    root = os.environ.get('DEPLOY_BACKEND_ROOT')
    if not root:
        sys.exit('Missing required environment variable: DEPLOY_BACKEND_ROOT')
    upload(files, root)
    print("Uploaded successfully")

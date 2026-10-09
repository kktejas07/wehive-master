"""Upload frontend files (repo-relative paths) to the deploy host.

Usage: python sync_frontend.py frontend/src/pages/Blog.jsx [more files...]
Env: see deploy_ssh_common.py, plus DEPLOY_FRONTEND_ROOT (remote checkout root,
e.g. /etc/dokploy/applications/<app>/code).
"""
import os
import sys

from deploy_ssh_common import upload

DEFAULT_FILES = [
    'frontend/src/components/ui/ContentCard.tsx',
    'frontend/src/pages/Blog.jsx',
    'frontend/src/components/Newsroom.jsx',
    'frontend/src/components/admin/OverviewTab.jsx',
]

if __name__ == '__main__':
    files = sys.argv[1:] or DEFAULT_FILES
    root = os.environ.get('DEPLOY_FRONTEND_ROOT')
    if not root:
        sys.exit('Missing required environment variable: DEPLOY_FRONTEND_ROOT')
    upload(files, root)
    print("Frontend files uploaded successfully")

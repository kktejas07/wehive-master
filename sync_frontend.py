import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('65.21.196.49', username='root', password='Omsairam@4522!!')

sftp = client.open_sftp()
sftp.put('/Users/avks/Desktop/Projects /wehive/wehive-master/frontend/src/components/ui/ContentCard.tsx', '/etc/dokploy/applications/wehive-frontend-5bnblw/code/frontend/src/components/ui/ContentCard.tsx')
sftp.put('/Users/avks/Desktop/Projects /wehive/wehive-master/frontend/src/pages/Blog.jsx', '/etc/dokploy/applications/wehive-frontend-5bnblw/code/frontend/src/pages/Blog.jsx')
sftp.put('/Users/avks/Desktop/Projects /wehive/wehive-master/frontend/src/components/Newsroom.jsx', '/etc/dokploy/applications/wehive-frontend-5bnblw/code/frontend/src/components/Newsroom.jsx')
sftp.close()
client.close()
print("Frontend files uploaded successfully")

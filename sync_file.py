import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('65.21.196.49', username='root', password='Omsairam@4522!!')

sftp = client.open_sftp()
sftp.put('/Users/avks/Desktop/Projects /wehive/wehive-master/backend/routes_agents_ai.py', '/etc/dokploy/applications/wehive-backend-dtdyul/code/backend/routes_agents_ai.py')
sftp.close()
client.close()
print("Uploaded successfully")

#!/usr/bin/env python3
# 创建唯一命名的本地验收账号，不打印或提交凭据；仅运行于本地 mock 环境。
import json,os,secrets,subprocess,uuid,urllib.request
from pathlib import Path
root=Path(__file__).resolve().parents[1]
be=root.parent/'sxdg-be'
run=uuid.uuid4().hex[:8]
password=secrets.token_urlsafe(24)
accounts={}
for role in ['super_admin','operator','finance','customer_service']:
    name='ui-'+run+'-'+role
    subprocess.run([str(be/'bin/init-admin')],cwd=be,env=dict(os.environ,ADMIN_USERNAME=name,ADMIN_PASSWORD=password,ADMIN_ROLE=role),check=True,capture_output=True)
    accounts[role]={'account':name,'password':password}
p=root/'.e2e-accounts.json'
p.write_text(json.dumps(accounts));p.chmod(0o600)
print('已生成四角色本地验收账号，凭据仅保存于忽略文件。run='+run)

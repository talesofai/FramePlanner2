import os
import re
import json
import requests

# specify the directory you want to scan
src_dir = 'src'

# baidu translation
API_KEY = "xxx"
SECRET_KEY = "yyy"

# specify the file extensions you want to check
extensions = ('.js', '.jsx', '.ts', '.tsx', '.svelte')

# regex pattern to match Japanese text
japanese_pattern = r'[一-龯ぁ-んァ-ン。、？！]+'


def get_access_token():
    """
    使用 AK，SK 生成鉴权签名（Access Token）
    :return: access_token，或是None(如果错误)
    """
    url = "https://aip.baidubce.com/oauth/2.0/token"
    params = {"grant_type": "client_credentials", "client_id": API_KEY, "client_secret": SECRET_KEY}
    return str(requests.post(url, params=params).json().get("access_token"))

# url of the LibreTranslate API
access_token = get_access_token()

def get_translation(text):
    url = "https://aip.baidubce.com/rpc/2.0/mt/texttrans/v1?access_token=" + access_token
    
    payload = json.dumps({
        "from": "jp",
        "to": "zh",
        "q": text
    })

    headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
    
    response = requests.request("POST", url, headers=headers, data=payload)
    result = ''
    try:
        result = response.json()['result']['trans_result'][0]['dst']
    except:
        pass

    print(text, result)
    return result

def replace_with_translation(match):
    text = match.group(0)
    translation = get_translation(text)
    return translation

def translate_file(file_path):
    with open(file_path, 'r+', encoding='utf-8') as file:
        content = file.read()
        new_content = re.sub(japanese_pattern, replace_with_translation, content)
        file.seek(0)
        file.write(new_content)
        file.truncate()


for root, _, files in os.walk(src_dir):
    for file in files:
        if file.endswith(extensions):
            translate_file(os.path.join(root, file))

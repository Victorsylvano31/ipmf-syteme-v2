try:
    with open('seed_data.py', encoding='utf8') as f:
        exec(f.read())
except Exception as e:
    with open('error_out.txt', 'w', encoding='utf8') as f:
        f.write(repr(e))

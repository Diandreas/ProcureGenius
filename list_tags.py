
import re

def list_tags(file_path, tag_name):
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    for i, line in enumerate(lines):
        line_no = i + 1
        line = re.sub(r'{\/\*.*?\*\/}', '', line)
        line = re.sub(r'\/\/.*', '', line)
        
        # Find <Tag or </Tag
        matches = re.finditer(r'<(/?' + tag_name + r')', line)
        for match in matches:
            tag = match.group(1)
            print(f"Line {line_no}: {tag}")

if __name__ == "__main__":
    import sys
    tag = sys.argv[1] if len(sys.argv) > 1 else 'Tooltip'
    list_tags('frontend/src/pages/products/ProductDetail.jsx', tag)

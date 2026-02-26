
import re

def list_boxes(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    for i, line in enumerate(lines):
        line_no = i + 1
        line = re.sub(r'{\/\*.*?\*\/}', '', line)
        line = re.sub(r'\/\/.*', '', line)
        
        # Find <Box or </Box
        matches = re.finditer(r'<(/?Box)', line)
        for match in matches:
            tag = match.group(1)
            print(f"Line {line_no}: {tag}")

if __name__ == "__main__":
    list_boxes('frontend/src/pages/products/ProductDetail.jsx')

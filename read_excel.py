import openpyxl
import glob

files = glob.glob(r'D:\project\BFMa\ProcureGenius\Liste des produits du labo*.xlsx')
f = files[0]
wb = openpyxl.load_workbook(f)
ws = wb.active

print(f'=== ALL ROWS (data starts row 6) ===\n')
for i, row in enumerate(ws.iter_rows(min_row=5, values_only=True), 5):
    n, produit, desc, qte, unite, peremption = row
    print(f'{str(n):3} | {produit} | {qte} {unite}')

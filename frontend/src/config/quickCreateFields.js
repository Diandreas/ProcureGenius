/**
 * Configuration des champs pour les dialogs de création rapide
 */

export const clientFields = [
  {
    name: 'first_name',
    label: 'Prénom *',
    type: 'text',
    required: true,
    fullWidth: false
  },
  {
    name: 'last_name',
    label: 'Nom',
    type: 'text',
    required: false,
    fullWidth: false
  },
  {
    name: 'email',
    label: 'Email',
    type: 'email',
    required: false,
    fullWidth: true
  },
  {
    name: 'phone',
    label: 'Téléphone',
    type: 'tel',
    required: false,
    fullWidth: false
  },
  {
    name: 'company',
    label: 'Entreprise',
    type: 'text',
    required: false,
    fullWidth: false
  },
  {
    name: 'address',
    label: 'Adresse',
    type: 'text',
    required: false,
    fullWidth: true,
    multiline: true,
    rows: 2
  }
];

export const supplierFields = [
  {
    name: 'name',
    label: 'Nom du fournisseur *',
    type: 'text',
    required: true,
    fullWidth: true
  },
  {
    name: 'contact_person',
    label: 'Personne de contact',
    type: 'text',
    required: false,
    fullWidth: false
  },
  {
    name: 'email',
    label: 'Email',
    type: 'email',
    required: false,
    fullWidth: false
  },
  {
    name: 'phone',
    label: 'Téléphone',
    type: 'tel',
    required: false,
    fullWidth: false
  },
  {
    name: 'city',
    label: 'Ville',
    type: 'text',
    required: false,
    fullWidth: false
  },
  {
    name: 'address',
    label: 'Adresse',
    type: 'text',
    required: false,
    fullWidth: true,
    multiline: true,
    rows: 2
  }
];

export const getProductFields = (suppliers = [], selectedSupplier = null) => [
  {
    name: 'name',
    label: 'Nom du produit *',
    type: 'text',
    required: true,
    fullWidth: true
  },
  {
    name: 'product_type',
    label: 'Type *',
    type: 'select',
    required: true,
    fullWidth: false,
    options: [
      { value: 'physical', label: 'Produit physique' },
      { value: 'service', label: 'Service' },
      { value: 'digital', label: 'Produit numérique' }
    ]
  },
  {
    name: 'source_type',
    label: 'Source *',
    type: 'select',
    required: true,
    fullWidth: false,
    options: [
      { value: 'purchased', label: 'Acheté (fournisseur)' },
      { value: 'manufactured', label: 'Fabriqué (maison)' },
      { value: 'resale', label: 'Revente' }
    ]
  },
  {
    name: 'supplier_id',
    label: 'Fournisseur',
    type: 'select',
    required: false,
    fullWidth: true,
    options: [
      { value: '', label: 'Aucun' },
      ...suppliers.map(s => ({ value: s.id, label: s.name }))
    ],
    helperText: 'Requis si source = Acheté',
    disabled: selectedSupplier !== null
  },
  {
    name: 'price',
    label: 'Prix de vente *',
    type: 'number',
    required: true,
    fullWidth: false
  },
  {
    name: 'cost_price',
    label: "Prix d'achat",
    type: 'number',
    required: false,
    fullWidth: false
  },
  {
    name: 'stock_quantity',
    label: 'Stock initial',
    type: 'number',
    required: false,
    fullWidth: false,
    helperText: 'Pour produits physiques'
  },
  {
    name: 'description',
    label: 'Description',
    type: 'text',
    required: false,
    fullWidth: true,
    multiline: true,
    rows: 3
  }
];

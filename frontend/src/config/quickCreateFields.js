/**
 * Configuration des champs pour les dialogs de création rapide
 *
 * Les libellés sont des getters : ils sont traduits au moment de l'affichage
 * (langue courante d'i18next), pas au chargement du module.
 */
import i18n from 'i18next';

const tr = (key) => i18n.t(`products:quickCreate.${key}`);

export const clientFields = [
  {
    name: 'name',
    get label() { return tr('client.name'); },
    type: 'text',
    required: true,
    fullWidth: true
  },
  {
    name: 'contact_person',
    get label() { return tr('common.contactPerson'); },
    type: 'text',
    required: false,
    fullWidth: false
  },
  {
    name: 'email',
    get label() { return tr('common.email'); },
    type: 'email',
    required: false,
    fullWidth: false
  },
  {
    name: 'phone',
    get label() { return tr('common.phone'); },
    type: 'tel',
    required: false,
    fullWidth: false
  },
  {
    name: 'address',
    get label() { return tr('common.address'); },
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
    get label() { return tr('supplier.name'); },
    type: 'text',
    required: true,
    fullWidth: true
  },
  {
    name: 'contact_person',
    get label() { return tr('common.contactPerson'); },
    type: 'text',
    required: false,
    fullWidth: false
  },
  {
    name: 'email',
    get label() { return tr('common.email'); },
    type: 'email',
    required: false,
    fullWidth: false
  },
  {
    name: 'phone',
    get label() { return tr('common.phone'); },
    type: 'tel',
    required: false,
    fullWidth: false
  },
  {
    name: 'city',
    get label() { return tr('common.city'); },
    type: 'text',
    required: false,
    fullWidth: false
  },
  {
    name: 'address',
    get label() { return tr('common.address'); },
    type: 'text',
    required: false,
    fullWidth: true,
    multiline: true,
    rows: 2
  }
];

// Création rapide d'un SERVICE : pas de stock, pas de fournisseur/source.
// product_type='service' et source_type sont fournis via contextData.
export const serviceFields = [
  {
    name: 'name',
    get label() { return tr('service.name'); },
    type: 'text',
    required: true,
    fullWidth: true
  },
  {
    name: 'price',
    get label() { return tr('service.price'); },
    type: 'number',
    required: true,
    fullWidth: false
  },
  {
    name: 'cost_price',
    get label() { return tr('service.costPrice'); },
    type: 'number',
    required: false,
    fullWidth: false
  },
  {
    name: 'description',
    get label() { return tr('common.description'); },
    type: 'text',
    required: false,
    fullWidth: true,
    multiline: true,
    rows: 3
  }
];

export const getProductFields = (suppliers = [], selectedSupplier = null) => [
  {
    name: 'name',
    get label() { return tr('product.name'); },
    type: 'text',
    required: true,
    fullWidth: true
  },
  {
    name: 'product_type',
    get label() { return tr('product.type'); },
    type: 'select',
    required: true,
    fullWidth: false,
    options: [
      { value: 'physical', get label() { return tr('product.types.physical'); } },
      { value: 'service', get label() { return tr('product.types.service'); } },
      { value: 'digital', get label() { return tr('product.types.digital'); } }
    ]
  },
  {
    name: 'source_type',
    get label() { return tr('product.source'); },
    type: 'select',
    required: true,
    fullWidth: false,
    options: [
      { value: 'purchased', get label() { return tr('product.sources.purchased'); } },
      { value: 'manufactured', get label() { return tr('product.sources.manufactured'); } },
      { value: 'resale', get label() { return tr('product.sources.resale'); } }
    ]
  },
  {
    name: 'supplier_id',
    get label() { return tr('product.supplier'); },
    type: 'select',
    required: false,
    fullWidth: true,
    options: [
      { value: '', get label() { return tr('product.noSupplier'); } },
      ...suppliers.map(s => ({ value: s.id, label: s.name }))
    ],
    get helperText() { return tr('product.supplierHelper'); },
    disabled: selectedSupplier !== null
  },
  {
    name: 'price',
    get label() { return tr('product.price'); },
    type: 'number',
    required: true,
    fullWidth: false
  },
  {
    name: 'cost_price',
    get label() { return tr('product.costPrice'); },
    type: 'number',
    required: false,
    fullWidth: false
  },
  {
    name: 'stock_quantity',
    get label() { return tr('product.initialStock'); },
    type: 'number',
    required: false,
    fullWidth: false,
    get helperText() { return tr('product.initialStockHelper'); }
  },
  {
    name: 'description',
    get label() { return tr('common.description'); },
    type: 'text',
    required: false,
    fullWidth: true,
    multiline: true,
    rows: 3
  }
];

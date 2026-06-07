// Generation locale (cote client) d'un PDF de facture epure, via
// @react-pdf/renderer. Sert hors-ligne (le PDF backend n'est pas joignable) et
// pour les factures BROUILLON pas encore synchronisees.
//
// Volontairement simple et lisible : entete, infos client, tableau d'articles,
// totaux. Mention "BROUILLON" si la facture n'a pas encore de numero serveur.

import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, color: '#1f2733', fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  brand: { fontSize: 18, fontWeight: 'bold', color: '#2563eb' },
  title: { fontSize: 22, fontWeight: 'bold' },
  draftTag: {
    marginTop: 4, alignSelf: 'flex-start', backgroundColor: '#fff3cd',
    color: '#8a6d00', paddingVertical: 2, paddingHorizontal: 6, borderRadius: 3, fontSize: 8,
  },
  meta: { textAlign: 'right', color: '#5a6478' },
  section: { marginTop: 16 },
  label: { color: '#8a93a6', fontSize: 8, textTransform: 'uppercase', marginBottom: 2 },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e8ee', paddingVertical: 5 },
  th: { flexDirection: 'row', backgroundColor: '#f1f3f7', paddingVertical: 6, paddingHorizontal: 4, fontWeight: 'bold' },
  cDesc: { flex: 4, paddingHorizontal: 4 },
  cQty: { flex: 1, textAlign: 'right', paddingHorizontal: 4 },
  cPrice: { flex: 2, textAlign: 'right', paddingHorizontal: 4 },
  cTotal: { flex: 2, textAlign: 'right', paddingHorizontal: 4 },
  totals: { marginTop: 14, alignSelf: 'flex-end', width: '45%' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  grandTotal: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#1f2733', fontWeight: 'bold', fontSize: 13 },
  footer: { position: 'absolute', bottom: 28, left: 36, right: 36, textAlign: 'center', color: '#9aa3b5', fontSize: 8 },
});

const money = (v, currency = 'FCFA') => {
  const n = Number(v || 0);
  return `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
};

const InvoiceDoc = ({ invoice, currency }) => {
  const items = invoice.items || [];
  const isDraft = !invoice.invoice_number || String(invoice.invoice_number).startsWith('BROUILLON');
  const clientName = invoice.client_detail?.name || invoice.client_name || invoice.client?.name || '—';

  const subtotal = invoice.subtotal != null
    ? invoice.subtotal
    : items.reduce((s, it) => s + Number(it.quantity || 0) * Number(it.unit_price || 0), 0);
  const total = invoice.total_amount != null ? invoice.total_amount : subtotal;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>Procura</Text>
            <Text style={styles.title}>FACTURE</Text>
            {isDraft && <Text style={styles.draftTag}>VERSION RAPIDE — brouillon hors-ligne, non synchronisé</Text>}
          </View>
          <View style={styles.meta}>
            <Text>N° {invoice.invoice_number || '—'}</Text>
            {invoice.issue_date && <Text>Date : {invoice.issue_date}</Text>}
            {invoice.due_date && <Text>Échéance : {invoice.due_date}</Text>}
            {invoice.status && <Text>Statut : {invoice.status}</Text>}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Facturé à</Text>
          <Text style={{ fontSize: 12, fontWeight: 'bold' }}>{clientName}</Text>
          {invoice.title ? <Text style={{ color: '#5a6478', marginTop: 2 }}>{invoice.title}</Text> : null}
        </View>

        <View style={[styles.section, styles.th]}>
          <Text style={styles.cDesc}>Description</Text>
          <Text style={styles.cQty}>Qté</Text>
          <Text style={styles.cPrice}>P.U.</Text>
          <Text style={styles.cTotal}>Total</Text>
        </View>
        {items.map((it, i) => (
          <View style={styles.row} key={i}>
            <Text style={styles.cDesc}>{it.description || it.product_name || '—'}</Text>
            <Text style={styles.cQty}>{it.quantity ?? 1}</Text>
            <Text style={styles.cPrice}>{money(it.unit_price, currency)}</Text>
            <Text style={styles.cTotal}>{money((it.quantity || 0) * (it.unit_price || 0), currency)}</Text>
          </View>
        ))}

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Sous-total</Text>
            <Text>{money(subtotal, currency)}</Text>
          </View>
          {invoice.tax_amount != null && (
            <View style={styles.totalRow}>
              <Text>Taxes</Text>
              <Text>{money(invoice.tax_amount, currency)}</Text>
            </View>
          )}
          <View style={styles.grandTotal}>
            <Text>TOTAL</Text>
            <Text>{money(total, currency)}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          {isDraft
            ? 'Document provisoire généré hors-ligne. Le numéro définitif sera attribué à la synchronisation.'
            : 'Merci de votre confiance.'}
        </Text>
      </Page>
    </Document>
  );
};

/** Genere un Blob PDF de la facture cote client. */
export const buildOfflineInvoicePdf = async (invoice, currency = 'FCFA') => {
  return await pdf(<InvoiceDoc invoice={invoice} currency={currency} />).toBlob();
};

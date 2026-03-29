'use client';

import { useEffect, useState } from 'react';
import { paymentsAPI, billsAPI, customersAPI } from '../../lib/api';
import { Plus, Check, X, Search, FileText } from 'lucide-react';
import Notification, { useNotification } from '../../components/Notification';

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [bills, setBills] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmNotes, setConfirmNotes] = useState('');
  const [billSearch, setBillSearch] = useState('');
  const [showBillDropdown, setShowBillDropdown] = useState(false);
  const { notification, showSuccess, showError, hideNotification } = useNotification();
  const [formData, setFormData] = useState({
    bill_id: '',
    customer_id: '',
    payment_amount: '',
    payment_method: 'cash',
    transaction_id: '',
    bank_name: '',
    account_number: '',
  });

  // Debounce search and filter
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter]);

  // Fetch bills and customers only when modal is opened
  useEffect(() => {
    if (showModal) {
      fetchBillsAndCustomers();
    }
  }, [showModal]);

  const fetchData = async () => {
    try {
      const params = { status: statusFilter, limit: 100 };
      if (searchQuery && searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      const paymentsRes = await paymentsAPI.getAll(params);
      setPayments(paymentsRes.data.payments);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBillsAndCustomers = async () => {
    try {
      const [billsRes, customersRes] = await Promise.all([
        billsAPI.getAll({ status: '', limit: 100 }),
        customersAPI.getAll({ limit: 100 }),
      ]);
      // Filter bills to only show unpaid and partial
      const filteredBills = billsRes.data.bills.filter(
        bill => bill.status === 'unpaid' || bill.status === 'partial'
      );
      setBills(filteredBills);
      setCustomers(customersRes.data.customers);
    } catch (error) {
      console.error('Error fetching bills and customers:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await paymentsAPI.create(formData);
      setShowModal(false);
      setFormData({
        bill_id: '',
        customer_id: '',
        payment_amount: '',
        payment_method: 'cash',
        transaction_id: '',
        bank_name: '',
        account_number: '',
      });
      setBillSearch('');
      setShowBillDropdown(false);
      fetchData();
      showSuccess('Pembayaran berhasil dibuat!');
    } catch (error) {
      console.error('Error creating payment:', error);
      showError(error.response?.data?.error || 'Gagal membuat pembayaran');
    }
  };

  const handleConfirm = async (paymentId) => {
    setSelectedPayment(paymentId);
    setConfirmNotes('');
    setPaymentDetails(null);
    setShowConfirmModal(true);
    
    // Fetch payment details
    try {
      const response = await paymentsAPI.getById(paymentId);
      setPaymentDetails(response.data);
    } catch (error) {
      console.error('Error fetching payment details:', error);
      alert('Gagal memuat detail pembayaran');
      setShowConfirmModal(false);
    }
  };

  const handleConfirmSubmit = async () => {
    setConfirming(true);
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    try {
      const result = await paymentsAPI.confirm(selectedPayment, { 
        confirmed_by: user.id, 
        notes: confirmNotes 
      });
      
      // Show result
      if (result.data.late_fee_applied > 0) {
        showSuccess(`Pembayaran berhasil dikonfirmasi! Denda keterlambatan sebesar ${formatCurrency(result.data.late_fee_applied)} telah ditambahkan.`);
      } else if (result.data.bill_status === 'partial') {
        showSuccess(`Pembayaran berhasil dikonfirmasi! Total Tagihan: ${formatCurrency(result.data.paid_amount + result.data.remaining_amount)}, Sudah Dibayar: ${formatCurrency(result.data.paid_amount)}, Sisa Pembayaran: ${formatCurrency(result.data.remaining_amount)}`);
      } else {
        showSuccess('Pembayaran berhasil dikonfirmasi!');
      }
      
      setShowConfirmModal(false);
      fetchData();
    } catch (error) {
      console.error('Error confirming payment:', error);
      showError(error.response?.data?.error || 'Gagal mengkonfirmasi pembayaran');
    } finally {
      setConfirming(false);
    }
  };

  const handleReject = async (paymentId) => {
    if (confirm('Apakah Anda yakin ingin menolak pembayaran ini?')) {
      try {
        await paymentsAPI.reject(paymentId, {});
        showSuccess('Pembayaran berhasil ditolak!');
        fetchData();
      } catch (error) {
        console.error('Error rejecting payment:', error);
        alert(error.response?.data?.error || 'Gagal menolak pembayaran');
      }
    }
  };

  const handleViewInvoice = async (paymentId) => {
    try {
      const response = await paymentsAPI.getInvoice(paymentId);
      const invoice = response.data.invoice;
      
      // Create a new window and directly print - thermal printer 80mm x 120mm format
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Mohon izinkan popup untuk打印 invoice');
        return;
      }
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoice - ${invoice.invoice_number}</title>
          <style>
            @page { size: 80mm 120mm; margin: 5mm; }
            body { font-family: 'Courier New', monospace; padding: 2px; width: 80mm; margin: 0 auto; font-size: 9px; line-height: 1.2; }
            .invoice-container { width: 80mm; min-height: 120mm; page-break-after: always; page-break-inside: avoid; box-sizing: border-box; margin: 5px; }
            .invoice-header { text-align: center; margin-bottom: 5px; border-bottom: 1px dashed #333; padding-bottom: 5px; }
            .invoice-header h1 { margin: 0 0 3px 0; font-size: 11px; }
            .invoice-header p { margin: 1px 0; font-size: 8px; }
            .invoice-info { margin-bottom: 5px; font-size: 8px; }
            .invoice-info p { margin: 1px 0; }
            .invoice-table { width: 100%; border-collapse: collapse; margin-bottom: 5px; font-size: 8px; box-sizing: border-box; }
            .invoice-table th, .invoice-table td { padding: 2px 0; text-align: left; border-bottom: 1px solid #eee; box-sizing: border-box; }
            .total-row { font-weight: bold; border-top: 1px dashed #333; }
            .invoice-footer { margin-top: 5px; padding-top: 5px; border-top: 1px dashed #333; font-size: 8px; }
            .invoice-footer p { margin: 1px 0; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            @media print { 
              @page { size: 80mm 120mm; margin: 5mm; }
              body { width: 80mm; margin: 0; padding: 0; }
              .invoice-container { width: 80mm; min-height: 120mm; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
          <div class="invoice-header">
            <h1>INVOICE</h1>
            <p><strong>Sumber Adem</strong></p>
            <p>Eretan Kulon, Kandanghaur</p>
          </div>
          <div class="invoice-info">
            <p>No: ${invoice.invoice_number}</p>
            <p>Tgl: ${new Date(invoice.invoice_date).toLocaleDateString('id-ID')}</p>
            <p>Pelanggan: ${invoice.customer?.name || '-'}</p>
            <p>No. Pel: ${invoice.customer?.number || '-'}</p>
          </div>
          <table class="invoice-table">
            <tbody>
              <tr>
                <td>Tagihan ${invoice.bill?.period || '-'}</td>
                <td class="text-right">Rp${parseFloat(invoice.charges?.water_charge || 0).toLocaleString('id-ID')}</td>
              </tr>
              <tr>
                <td>Meter Awal</td>
                <td class="text-right">${parseFloat(invoice.bill?.previous_reading || 0).toLocaleString('id-ID')}</td>
              </tr>
              <tr>
                <td>Meter Akhir</td>
                <td class="text-right">${parseFloat(invoice.bill?.current_reading || 0).toLocaleString('id-ID')}</td>
              </tr>
              <tr>
                <td>Pemakaian</td>
                <td class="text-right">${parseFloat(invoice.bill?.usage_cubic || 0).toLocaleString('id-ID')}</td>
              </tr>
              <tr>
                <td>Admin</td>
                <td class="text-right">Rp${parseFloat(invoice.charges?.admin_fee || 0).toLocaleString('id-ID')}</td>
              </tr>
              <tr>
                <td>Denda</td>
                <td class="text-right">Rp${parseFloat(invoice.charges?.late_fee || 0).toLocaleString('id-ID')}</td>
              </tr>
              <tr>
                <td>Lainnya</td>
                <td class="text-right">Rp${parseFloat(invoice.charges?.other_charges || 0).toLocaleString('id-ID')}</td>
              </tr>
              <tr class="total-row">
                <td><strong>Total</strong></td>
                <td class="text-right"><strong>Rp${parseFloat(invoice.charges?.total_bill || 0).toLocaleString('id-ID')}</strong></td>
              </tr>
              <tr>
                <td>Bayar</td>
                <td class="text-right">Rp${parseFloat(invoice.charges?.amount_paid || 0).toLocaleString('id-ID')}</td>
              </tr>
              <tr>
                <td><strong>Sisa</strong></td>
                <td class="text-right"><strong>Rp${parseFloat(invoice.charges?.remaining_amount || 0).toLocaleString('id-ID')}</strong></td>
              </tr>
            </tbody>
          </table>
          <div class="invoice-footer">
            <p class="text-center"><strong>${(invoice.charges?.remaining_amount || 0) > 0 ? 'BELUM LUNAS' : 'LUNAS'}</strong></p>
            <p>Petugas: ${invoice.payment?.confirmed_by || '-'}</p>
            <p class="text-center">-- Terima Kasih --</p>
          </div>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      
      // Show print dialog after a delay
      setTimeout(() => {
        try {
          printWindow.print();
        } catch (e) {
          console.log('Print canceled or failed');
        }
      }, 500);
    } catch (error) {
      console.error('Error fetching invoice:', error);
      alert(error.response?.data?.error || 'Gagal memuat invoice');
    }
  };

  const handleBillChange = (billId) => {
    const bill = bills.find(b => b.id === billId);
    const paidAmount = parseFloat(bill?.paid_amount) || 0;
    const totalAmount = parseFloat(bill?.total_amount) || 0;
    const remainingAmount = totalAmount - paidAmount;
    
    setFormData({
      ...formData,
      bill_id: billId,
      customer_id: bill?.customer_id,
      payment_amount: remainingAmount.toString(),  // Default to remaining amount
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: 'badge-warning',
      confirmed: 'badge-success',
      failed: 'badge-danger',
      refunded: 'badge-secondary',
    };
    return statusMap[status] || 'badge-secondary';
  };

  const getMethodLabel = (method) => {
    const methodMap = {
      cash: 'Tunai',
      bank_transfer: 'Transfer Bank',
      e_wallet: 'E-Wallet',
      credit_card: 'Kartu Kredit',
    };
    return methodMap[method] || method;
  };

  return (
    <div>
      <div className="header">
        <h1>Pembayaran</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Catat Pembayaran
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1, maxWidth: '300px' }}>
              <Search size={18} style={{ position: 'absolute', left: '10px', color: 'var(--text-light)', zIndex: 1 }} />
              <input
                type="text"
                className="search-input"
                placeholder="Cari nama pelanggan atau nomor pembayaran..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '36px', width: '100%' }}
              />
            </div>
            <select
              className="form-select"
              style={{ width: '200px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
            <option value="">Semua Status</option>
            <option value="pending">Menunggu</option>
            <option value="confirmed">Dikonfirmasi</option>
            <option value="failed">Gagal</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p className="text-center">Memuat...</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>No. Pembayaran</th>
                  <th>No. Tagihan</th>
                  <th>Pelanggan</th>
                  <th>Jumlah</th>
                  <th>Metode</th>
                  <th>Tanggal</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {payments.length > 0 ? (
                  payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{payment.payment_number}</td>
                      <td>{payment.bill_number}</td>
                      <td>{payment.customer_name}</td>
                      <td>{formatCurrency(payment.payment_amount)}</td>
                      <td>{getMethodLabel(payment.payment_method)}</td>
                      <td>{formatDate(payment.created_at)}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(payment.status)}`}>
                          {payment.status}
                        </span>
                      </td>
                      <td>
                        {payment.status === 'pending' && (
                          <div className="flex gap-1">
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => handleConfirm(payment.id)}
                              title="Konfirmasi"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleReject(payment.id)}
                              title="Tolak"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )}
                        {payment.status === 'completed' && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleViewInvoice(payment.id)}
                            title="Invoice"
                          >
                            <FileText size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center" style={{ color: 'var(--text-light)' }}>
                      Tidak ada pembayaran
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Catat Pembayaran Baru</h3>
              <button className="modal-close" onClick={() => { setShowModal(false); setBillSearch(''); setShowBillDropdown(false); }}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Tagihan *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Cari nomor tagihan atau nama pelanggan..."
                    value={billSearch}
                    onChange={(e) => {
                      setBillSearch(e.target.value);
                      setShowBillDropdown(true);
                    }}
                    onFocus={() => setShowBillDropdown(true)}
                  />
                  {showBillDropdown && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      maxHeight: '200px',
                      overflowY: 'auto',
                      background: 'white',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      zIndex: 1000,
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}>
                      {bills
                        .filter(bill => 
                          bill.bill_number?.toLowerCase().includes(billSearch.toLowerCase()) ||
                          bill.customer_name?.toLowerCase().includes(billSearch.toLowerCase())
                        )
                        .slice(0, 10)
                        .map((bill) => {
                          const paidAmount = parseFloat(bill.paid_amount) || 0;
                          const totalAmount = parseFloat(bill.total_amount) || 0;
                          const remainingAmount = totalAmount - paidAmount;
                          const isPartial = bill.status === 'partial';
                          return (
                            <div
                              key={bill.id}
                              style={{
                                padding: '10px',
                                cursor: 'pointer',
                                borderBottom: '1px solid #eee',
                                background: formData.bill_id === bill.id ? '#f0f0f0' : 'white'
                              }}
                              onClick={() => {
                                handleBillChange(bill.id);
                                setBillSearch(`${bill.bill_number} - ${bill.customer_name}`);
                                setShowBillDropdown(false);
                              }}
                              onMouseEnter={(e) => e.target.style.background = '#f5f5f5'}
                              onMouseLeave={(e) => e.target.style.background = formData.bill_id === bill.id ? '#f0f0f0' : 'white'}
                            >
                              <div style={{ fontWeight: 'bold' }}>{bill.bill_number}</div>
                              <div style={{ fontSize: '12px', color: '#666' }}>
                                {bill.customer_name} 
                                {isPartial ? ` (Sisa: ${formatCurrency(remainingAmount)})` : ` (${formatCurrency(totalAmount)})`}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Jumlah Pembayaran *</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.payment_amount}
                  onChange={(e) => setFormData({ ...formData, payment_amount: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Metode Pembayaran *</label>
                <select
                  className="form-select"
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  required
                >
                  <option value="cash">Tunai</option>
                  <option value="bank_transfer">Transfer Bank</option>
                  <option value="e_wallet">E-Wallet</option>
                  <option value="credit_card">Kartu Kredit</option>
                </select>
              </div>
              {formData.payment_method !== 'cash' && (
                <>
                  <div className="form-group">
                    <label className="form-label">ID Transaksi</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.transaction_id}
                      onChange={(e) => setFormData({ ...formData, transaction_id: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nama Bank</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">No. Rekening</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.account_number}
                      onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                    />
                  </div>
                </>
              )}
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => { setShowModal(false); setBillSearch(''); setShowBillDropdown(false); }}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal with Details */}
      {showConfirmModal && paymentDetails && (
        <div className="modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Konfirmasi Pembayaran</h3>
              <button className="modal-close" onClick={() => setShowConfirmModal(false)}>✕</button>
            </div>
            
            <div style={{ padding: '20px' }}>
              {/* Payment Info */}
              <div style={{ marginBottom: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666' }}>Informasi Pembayaran</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px' }}>
                  <div><strong>No. Pembayaran:</strong> {paymentDetails.payment_number}</div>
                  <div><strong>No. Tagihan:</strong> {paymentDetails.bill_number}</div>
                  <div><strong>Pelanggan:</strong> {paymentDetails.customer_name}</div>
                  <div><strong>Metode:</strong> {getMethodLabel(paymentDetails.payment_method)}</div>
                  <div><strong>Tanggal Bayar:</strong> {formatDate(paymentDetails.created_at)}</div>
                  <div><strong>Jumlah Bayar:</strong> {formatCurrency(paymentDetails.payment_amount)}</div>
                </div>
              </div>

              {/* Bill Details */}
              <div style={{ marginBottom: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666' }}>Detail Tagihan</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px' }}>
                  <div><strong>Periode:</strong> {paymentDetails.cycle_name}</div>
                  <div><strong>Tarif:</strong> {paymentDetails.tariff_name}</div>
                  <div><strong>Pemakaian:</strong> {paymentDetails.usage_cubic} m³</div>
                  <div><strong>Harga per m³:</strong> {formatCurrency(paymentDetails.tariff_price)}</div>
                  <div><strong>Bacaan Meter:</strong> {paymentDetails.previous_reading} → {paymentDetails.current_reading}</div>
                  <div><strong>Jatuh Tempo:</strong> {new Date(paymentDetails.due_date).toLocaleDateString('id-ID')}</div>
                </div>
              </div>

              {/* Cost Breakdown */}
              <div style={{ marginBottom: '20px', padding: '15px', background: '#fff', border: '1px solid #dee2e6', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666' }}>Rincian Biaya</h4>
                <table style={{ width: '100%', fontSize: '14px' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '8px 0' }}>Air ({paymentDetails.usage_cubic} m³ × {formatCurrency(paymentDetails.tariff_price)})</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(paymentDetails.water_charge)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 0' }}>Admin Fee</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(paymentDetails.admin_fee)}</td>
                    </tr>
                    {parseFloat(paymentDetails.late_fee) > 0 && (
                      <tr style={{ color: '#dc3545', fontWeight: 'bold' }}>
                        <td style={{ padding: '8px 0' }}>Denda Keterlambatan</td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(paymentDetails.late_fee)}</td>
                      </tr>
                    )}
                    {parseFloat(paymentDetails.other_charges) > 0 && (
                      <tr>
                        <td style={{ padding: '8px 0' }}>Biaya Lainnya</td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(paymentDetails.other_charges)}</td>
                      </tr>
                    )}
                    <tr style={{ borderTop: '2px solid #dee2e6', fontWeight: 'bold', fontSize: '16px' }}>
                      <td style={{ padding: '12px 0 8px 0' }}>Total</td>
                      <td style={{ textAlign: 'right', padding: '12px 0 8px 0' }}>{formatCurrency(paymentDetails.bill_total_amount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Late Fee Warning */}
              {new Date() > new Date(paymentDetails.due_date) && parseFloat(paymentDetails.late_fee) === 0 && parseFloat(paymentDetails.tariff_late_fee) > 0 && (
                <div style={{ 
                  marginBottom: '20px', 
                  padding: '15px', 
                  background: '#fff3cd', 
                  border: '1px solid #ffc107', 
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <AlertTriangle size={24} color="#856404" />
                  <div>
                    <strong style={{ color: '#856404' }}>Peringatan Denda!</strong>
                    <p style={{ margin: '5px 0 0 0', color: '#856404', fontSize: '14px' }}>
                      Tagihan sudah melampaui jatuh tempo. Akan ditambahkan denda keterlambatan sebesar {formatCurrency(paymentDetails.tariff_late_fee)} saat konfirmasi.
                    </p>
                  </div>
                </div>
              )}

              {/* Notes Input */}
              <div className="form-group">
                <label className="form-label">Catatan (Opsional)</label>
                <textarea
                  className="form-input"
                  rows="2"
                  value={confirmNotes}
                  onChange={(e) => setConfirmNotes(e.target.value)}
                  placeholder="Tambahkan catatan jika diperlukan..."
                />
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setShowConfirmModal(false)}>
                Batal
              </button>
              <button 
                type="button" 
                className="btn btn-success" 
                onClick={handleConfirmSubmit}
                disabled={confirming}
              >
                {confirming ? 'Mengonfirmasi...' : 'Konfirmasi Pembayaran'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Invoice Modal */}
      {showInvoiceModal && invoiceData && (
        <div className="modal-overlay">
          <div className="modal-content invoice-modal">
            <div className="invoice-header">
              <h2>INVOICE</h2>
              <p>No. {invoiceData.invoice_number}</p>
            </div>
            
            <div className="invoice-info">
              <div className="invoice-row">
                <span>Tanggal:</span>
                <span>{new Date(invoiceData.payment_date).toLocaleDateString('id-ID')}</span>
              </div>
              <div className="invoice-row">
                <span>Pelanggan:</span>
                <span>{invoiceData.customer_name}</span>
              </div>
              <div className="invoice-row">
                <span>No. Meter:</span>
                <span>{invoiceData.meter_number}</span>
              </div>
            </div>

            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Deskripsi</th>
                  <th style={{textAlign: 'right'}}>Jumlah</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Tagihan Bulan {new Date(invoiceData.period_start).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</td>
                  <td style={{textAlign: 'right'}}>Rp {parseFloat(invoiceData.amount).toLocaleString('id-ID')}</td>
                </tr>
                <tr>
                  <td>Denda</td>
                  <td style={{textAlign: 'right'}}>Rp {parseFloat(invoiceData.late_fee || 0).toLocaleString('id-ID')}</td>
                </tr>
                <tr className="total-row">
                  <td><strong>Total</strong></td>
                  <td style={{textAlign: 'right'}}><strong>Rp {parseFloat(invoiceData.total_amount).toLocaleString('id-ID')}</strong></td>
                </tr>
              </tbody>
            </table>

            <div className="invoice-footer">
              <p>Status: LUNAS</p>
              <p>Terverifikasi pada: {new Date(invoiceData.payment_date).toLocaleString('id-ID')}</p>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setShowInvoiceModal(false)}>
                Tutup
              </button>
              <button type="button" className="btn btn-primary" onClick={() => window.print()}>
                Cetak Invoice
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Notification */}
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          duration={notification.duration}
          onClose={hideNotification}
        />
      )}
    </div>
  );
}
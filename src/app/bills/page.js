'use client';

import { useEffect, useState, useRef } from 'react';
import { billsAPI, customersAPI, dashboardAPI } from '../../lib/api';
import { Plus, Search } from 'lucide-react';
import Notification, { useNotification } from '../../components/Notification';

export default function BillsPage() {
  const [bills, setBills] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const { notification, showSuccess, showError, hideNotification } = useNotification();
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 0,
  });
  const [formData, setFormData] = useState({
    customer_id: '',
    billing_cycle_id: '',
    previous_reading: '',
    current_reading: '',
    due_date: '',
    other_charges: 0,
  });
  const [showDropdown, setShowDropdown] = useState(false);
  const [periodPicker, setPeriodPicker] = useState('');
  const dropdownRef = useRef(null);

  // Reset page to 1 when statusFilter changes
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [statusFilter]);

  useEffect(() => {
    fetchData();
  }, [statusFilter, pagination.page]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== '') {
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchData();
      }
    }, 500); // 500ms debounce
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = async () => {
    try {
      const [billsRes, customersRes, cyclesRes] = await Promise.all([
        billsAPI.getAll({ 
          status: statusFilter, 
          limit: 10, 
          page: pagination.page,
          search: searchQuery 
        }),
        customersAPI.getAll({ limit: 100 }),
        dashboardAPI.getBillingCycles(),
      ]);
      setBills(billsRes.data.bills);
      setCustomers(customersRes.data.customers);
      setCycles(cyclesRes.data.cycles);
      setPagination({
        page: billsRes.data.page || 1,
        total: billsRes.data.total || 0,
        totalPages: billsRes.data.totalPages || 0,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.customer_id) {
      alert('Silakan pilih pelanggan');
      return;
    }
    
    try {
      // Backend will automatically get previous reading from latest bill
      await billsAPI.create(formData);
      setShowModal(false);
      setFormData({
        customer_id: '',
        billing_cycle_id: '',
        previous_reading: '',
        current_reading: '',
        due_date: '',
        other_charges: 0,
      });
      setCustomerSearch('');
      setShowDropdown(false);
      setPeriodPicker('');
      fetchData();
      showSuccess('Tagihan berhasil dibuat!');
    } catch (error) {
      console.error('Error creating bill:', error);
      showError(error.response?.data?.error || 'Gagal membuat tagihan');
    }
  };

  const handleCustomerChange = async (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    
    // Get latest bill for this customer to get previous reading
    try {
      const response = await billsAPI.getLatestByCustomer(customerId);
      const latestBill = response.data.bill;
      
      setFormData({
        ...formData,
        customer_id: customerId,
        previous_reading: latestBill?.current_reading || customer?.meter_reading || 0,
      });
    } catch (error) {
      // Fallback to meter_reading if API fails
      setFormData({
        ...formData,
        customer_id: customerId,
        previous_reading: customer?.meter_reading || 0,
      });
    }
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
    });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      unpaid: 'badge-danger',
      partial: 'badge-warning',
      paid: 'badge-success',
      overdue: 'badge-warning',
      cancelled: 'badge-secondary',
    };
    return statusMap[status] || 'badge-secondary';
  };

  const getStatusLabel = (status) => {
    const labelMap = {
      unpaid: 'Belum Lunas',
      partial: 'Cicilan',
      paid: 'Lunas',
      overdue: 'Jatuh Tempo',
      cancelled: 'Dibatalkan',
    };
    return labelMap[status] || status;
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.customer_number.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const selectedCustomer = customers.find(c => c.id === formData.customer_id);

  return (
    <div>
      <div className="header">
        <h1>Tagihan</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Buat Tagihan
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1, maxWidth: '300px' }}>
              <Search size={18} style={{ position: 'absolute', left: '10px', color: 'var(--text-light)', zIndex: 1 }} />
              <input
                type="text"
                className="search-input"
                placeholder="Cari nama pelanggan atau nomor tagihan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '36px', width: '100%' }}
              />
            </div>
            <select
              className="form-select"
              style={{ width: '160px' }}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination({ ...pagination, page: 1 });
              }}
            >
              <option value="">Semua Status</option>
              <option value="unpaid">Belum Lunas</option>
              <option value="partial">Cicilan</option>
              <option value="paid">Lunas</option>
              <option value="overdue">Jatuh Tempo</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p className="text-center">Memuat...</p>
        ) : (
          <>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>No. Tagihan</th>
                    <th>Pelanggan</th>
                    <th>Periode</th>
                    <th>Pemakaian (m³)</th>
                    <th>Total</th>
                    <th>Jatuh Tempo</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.length > 0 ? (
                    bills.map((bill) => (
                    <tr key={bill.id}>
                      <td>{bill.bill_number}</td>
                      <td>{bill.customer_name}</td>
                      <td>{bill.cycle_name}</td>
                      <td>{bill.usage_cubic}</td>
                      <td>{formatCurrency(bill.total_amount)}</td>
                      <td>{formatDate(bill.due_date)}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(bill.status)}`}>
                          {getStatusLabel(bill.status)}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center" style={{ color: 'var(--text-light)' }}>
                      Tidak ada tagihan
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {pagination.totalPages > 0 && (
            <div className="pagination">
              <span className="pagination-info">
                Menampilkan {((pagination.page - 1) * 10) + 1} - {Math.min(pagination.page * 10, pagination.total)} dari {pagination.total} data
              </span>
              <div className="pagination-controls">
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                >
                  Prev
                </button>
                {[...Array(pagination.totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    className={`btn btn-sm ${pagination.page === i + 1 ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setPagination({ ...pagination, page: i + 1 })}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page === pagination.totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Buat Tagihan Baru</h3>
              <button className="modal-close" onClick={() => { setShowModal(false); setPeriodPicker(''); }}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Pelanggan *</label>
                <div style={{ position: 'relative' }} ref={dropdownRef}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Cari pelanggan..."
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                  />
                  {selectedCustomer && (
                    <div style={{ marginTop: '5px', padding: '8px', background: '#f0f0f0', borderRadius: '4px', fontSize: '14px' }}>
                      <strong>Terpilih:</strong> {selectedCustomer.name}
                    </div>
                  )}
                  {showDropdown && filteredCustomers.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      maxHeight: '200px',
                      overflowY: 'auto',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      background: 'white',
                      zIndex: 1000,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                      {filteredCustomers.map((customer) => (
                        <div
                          key={customer.id}
                          style={{
                            padding: '10px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f0f0f0',
                            background: formData.customer_id === customer.id ? '#e3f2fd' : 'white'
                          }}
                          onClick={() => {
                            handleCustomerChange(customer.id);
                            setCustomerSearch('');
                            setShowDropdown(false);
                          }}
                          onMouseEnter={(e) => e.target.style.background = '#f5f5f5'}
                          onMouseLeave={(e) => e.target.style.background = formData.customer_id === customer.id ? '#e3f2fd' : 'white'}
                        >
                          {customer.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Periode Tagihan *</label>
                <input
                  type="month"
                  className="form-input"
                  value={periodPicker}
                  onChange={(e) => {
                    const selectedValue = e.target.value;
                    setPeriodPicker(selectedValue);
                    // Parse year and month directly to avoid timezone issues
                    const [selectedYear, selectedMonth] = selectedValue.split('-').map(Number);
                    // Find matching billing cycle
                    const matchingCycle = cycles.find(c => {
                      const cycleDate = new Date(c.start_date);
                      // Use local date parsing to get correct month
                      const cycleMonth = cycleDate.getMonth() + 1; // getMonth is 0-based, convert to 1-based
                      const cycleYear = cycleDate.getFullYear();
                      return cycleMonth === selectedMonth && cycleYear === selectedYear;
                    });
                    setFormData({ ...formData, billing_cycle_id: matchingCycle?.id || '' });
                  }}
                  required
                />
              </div>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Pembacaan Sebelumnya</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.previous_reading}
                    readOnly
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Pembacaan Saat Ini *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.current_reading}
                    onChange={(e) => setFormData({ ...formData, current_reading: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Tanggal Jatuh Tempo *</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Biaya Lainnya</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.other_charges}
                  onChange={(e) => setFormData({ ...formData, other_charges: e.target.value })}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => { setShowModal(false); setPeriodPicker(''); }}>
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
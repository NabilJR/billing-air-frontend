'use client';

import { useEffect, useState } from 'react';
import { customersAPI } from '../../lib/api';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import Notification, { useNotification } from '../../components/Notification';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
   const { notification, showSuccess, showError, hideNotification } = useNotification();
  const [formData, setFormData] = useState({
    customer_number: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    district: '',
    city: '',
    postal_code: '',
    meter_number: '',
    customer_type: 'residential',
  });

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  const fetchCustomers = async () => {
    try {
      const response = await customersAPI.getAll({ search, limit: 100 });
      setCustomers(response.data.customers);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await customersAPI.update(editingCustomer.id, formData);
        showSuccess('Pelanggan berhasil diperbarui!');
      } else {
        await customersAPI.create(formData);
        showSuccess('Pelanggan berhasil ditambahkan!');
      }
      setShowModal(false);
      setEditingCustomer(null);
      setFormData({
        customer_number: '',
        name: '',
        email: '',
        phone: '',
        address: '',
        district: '',
        city: '',
        postal_code: '',
        meter_number: '',
        customer_type: 'residential',
      });
      fetchCustomers();
    } catch (error) {
      console.error('Error saving customer:', error);
      showError(error.response?.data?.error || 'Gagal menyimpan pelanggan');
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      customer_number: customer.customer_number,
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      district: customer.district || '',
      city: customer.city || '',
      postal_code: customer.postal_code || '',
      meter_number: customer.meter_number,
      customer_type: customer.customer_type,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Apakah Anda yakin ingin menghapus pelanggan ini?')) {
      try {
        await customersAPI.delete(id);
        fetchCustomers();
      } catch (error) {
        console.error('Error deleting customer:', error);
        alert(error.response?.data?.error || 'Gagal menghapus pelanggan');
      }
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      active: 'badge-success',
      inactive: 'badge-secondary',
      suspended: 'badge-danger',
    };
    return statusMap[status] || 'badge-secondary';
  };

  const getTypeBadge = (type) => {
    const typeMap = {
      residential: 'badge-secondary',
      commercial: 'badge-warning',
      industrial: 'badge-danger',
    };
    return typeMap[type] || 'badge-secondary';
  };

  return (
    <div>
      <div className="header">
        <h1>Pelanggan</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Tambah Pelanggan
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div style={{ position: 'relative', width: '300px' }}>
            <Search 
              size={18} 
              style={{ 
                position: 'absolute', 
                left: '10px', 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: 'var(--text-light)'
              }} 
            />
            <input
              type="text"
              className="form-input"
              placeholder="Cari pelanggan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '36px' }}
            />
          </div>
        </div>

        {loading ? (
          <p className="text-center">Memuat...</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>No. Pelanggan</th>
                  <th>Nama</th>
                  <th>No. Meter</th>
                  <th>Tipe</th>
                  <th>Telepon</th>
                  <th>Alamat</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {customers.length > 0 ? (
                  customers.map((customer) => (
                    <tr key={customer.id}>
                      <td>{customer.customer_number}</td>
                      <td>{customer.name}</td>
                      <td>{customer.meter_number}</td>
                      <td>
                        <span className={`badge ${getTypeBadge(customer.customer_type)}`}>
                          {customer.customer_type}
                        </span>
                      </td>
                      <td>{customer.phone || '-'}</td>
                      <td>{customer.address || '-'}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(customer.status)}`}>
                          {customer.status}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <button 
                            className="btn btn-outline btn-sm" 
                            onClick={() => handleEdit(customer)}
                          >
                            <Edit size={14} />
                          </button>
                          <button 
                            className="btn btn-danger btn-sm" 
                            onClick={() => handleDelete(customer.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center" style={{ color: 'var(--text-light)' }}>
                      Tidak ada pelanggan
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
              <h3 className="modal-title">
                {editingCustomer ? 'Edit Pelanggan' : 'Tambah Pelanggan'}
              </h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">No. Pelanggan *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.customer_number}
                    onChange={(e) => setFormData({ ...formData, customer_number: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">No. Meter *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.meter_number}
                    onChange={(e) => setFormData({ ...formData, meter_number: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Nama *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Telepon</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Alamat</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Kecamatan</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Kota</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Tipe Pelanggan</label>
                <select
                  className="form-select"
                  value={formData.customer_type}
                  onChange={(e) => setFormData({ ...formData, customer_type: e.target.value })}
                >
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="industrial">Industrial</option>
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
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
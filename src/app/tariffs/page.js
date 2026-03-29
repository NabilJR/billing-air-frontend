'use client';

import { useEffect, useState } from 'react';
import { tariffsAPI } from '../../lib/api';
import { Plus, Edit, Trash2 } from 'lucide-react';
import Notification, { useNotification } from '../../components/Notification';

export default function TariffsPage() {
  const [tariffs, setTariffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTariff, setEditingTariff] = useState(null);
  const { notification, showSuccess, showError, hideNotification } = useNotification();
  const [formData, setFormData] = useState({
    tariff_name: '',
    customer_type: 'residential',
    min_usage_cubic: 0,
    price_per_cubic: '',
    admin_fee: 0,
    late_fee: 0,
    effective_date: '',
    end_date: '',
  });

  useEffect(() => {
    fetchTariffs();
  }, [typeFilter]);

  const fetchTariffs = async () => {
    try {
      const response = await tariffsAPI.getAll({ customer_type: typeFilter });
      setTariffs(response.data.tariffs);
    } catch (error) {
      console.error('Error fetching tariffs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTariff) {
        await tariffsAPI.update(editingTariff.id, formData);
        showSuccess('Tarif berhasil diperbarui!');
      } else {
        await tariffsAPI.create(formData);
        showSuccess('Tarif berhasil ditambahkan!');
      }
      setShowModal(false);
      setEditingTariff(null);
      setFormData({
        tariff_name: '',
        customer_type: 'residential',
        min_usage_cubic: 0,
        price_per_cubic: '',
        admin_fee: 0,
        late_fee: 0,
        effective_date: '',
        end_date: '',
      });
      fetchTariffs();
    } catch (error) {
      console.error('Error saving tariff:', error);
      showError(error.response?.data?.error || 'Gagal menyimpan tarif');
    }
  };

  const handleEdit = (tariff) => {
    setEditingTariff(tariff);
    setFormData({
      tariff_name: tariff.tariff_name,
      customer_type: tariff.customer_type,
      min_usage_cubic: tariff.min_usage_cubic,
      price_per_cubic: tariff.price_per_cubic,
      admin_fee: tariff.admin_fee,
      late_fee: tariff.late_fee,
      effective_date: tariff.effective_date,
      end_date: tariff.end_date || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Apakah Anda yakin ingin menghapus tarif ini?')) {
      try {
        await tariffsAPI.delete(id);
        fetchTariffs();
      } catch (error) {
        console.error('Error deleting tariff:', error);
        alert(error.response?.data?.error || 'Gagal menghapus tarif');
      }
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
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getTypeLabel = (type) => {
    const typeMap = {
      residential: 'Residential',
      commercial: 'Commercial',
      industrial: 'Industrial',
    };
    return typeMap[type] || type;
  };

  return (
    <div>
      <div className="header">
        <h1>Tarif</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Tambah Tarif
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <select
            className="form-select"
            style={{ width: '200px' }}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">Semua Tipe</option>
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
            <option value="industrial">Industrial</option>
          </select>
        </div>

        {loading ? (
          <p className="text-center">Memuat...</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nama Tarif</th>
                  <th>Tipe Pelanggan</th>
                  <th>Min. Pemakaian (m³)</th>
                  <th>Harga per m³</th>
                  <th>Biaya Admin</th>
                  <th>Denda</th>
                  <th>Tgl Efektif</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {tariffs.length > 0 ? (
                  tariffs.map((tariff) => (
                    <tr key={tariff.id}>
                      <td>{tariff.tariff_name}</td>
                      <td>{getTypeLabel(tariff.customer_type)}</td>
                      <td>{tariff.min_usage_cubic}</td>
                      <td>{formatCurrency(tariff.price_per_cubic)}</td>
                      <td>{formatCurrency(tariff.admin_fee)}</td>
                      <td>{formatCurrency(tariff.late_fee)}</td>
                      <td>{formatDate(tariff.effective_date)}</td>
                      <td>
                        <span className={`badge ${tariff.is_active ? 'badge-success' : 'badge-secondary'}`}>
                          {tariff.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <button 
                            className="btn btn-outline btn-sm" 
                            onClick={() => handleEdit(tariff)}
                          >
                            <Edit size={14} />
                          </button>
                          <button 
                            className="btn btn-danger btn-sm" 
                            onClick={() => handleDelete(tariff.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="text-center" style={{ color: 'var(--text-light)' }}>
                      Tidak ada tarif
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
                {editingTariff ? 'Edit Tarif' : 'Tambah Tarif'}
              </h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Nama Tarif *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.tariff_name}
                  onChange={(e) => setFormData({ ...formData, tariff_name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Tipe Pelanggan *</label>
                <select
                  className="form-select"
                  value={formData.customer_type}
                  onChange={(e) => setFormData({ ...formData, customer_type: e.target.value })}
                  required
                >
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="industrial">Industrial</option>
                </select>
              </div>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Min. Pemakaian (m³) *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.min_usage_cubic}
                    onChange={(e) => setFormData({ ...formData, min_usage_cubic: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Harga per m³ *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.price_per_cubic}
                    onChange={(e) => setFormData({ ...formData, price_per_cubic: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Biaya Admin</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.admin_fee}
                    onChange={(e) => setFormData({ ...formData, admin_fee: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Denda</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.late_fee}
                    onChange={(e) => setFormData({ ...formData, late_fee: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Tanggal Efektif *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.effective_date}
                    onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Tanggal Berakhir</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
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
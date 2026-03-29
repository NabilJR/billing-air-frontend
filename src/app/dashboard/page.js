'use client';

import { useEffect, useState } from 'react';
import { dashboardAPI } from '../../lib/api';
import { Users, Receipt, DollarSign, AlertTriangle, Clock, CheckCircle } from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [recentBills, setRecentBills] = useState([]);
  const [recentPayments, setRecentPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedYear, selectedMonth]);

  const fetchDashboardData = async () => {
    try {
      const yearParam = selectedYear.toString();
      const monthParam = selectedMonth.toString().padStart(2, '0');
      console.log('Fetching stats with year:', yearParam, 'month:', monthParam);
      
      const [statsRes, billsRes, paymentsRes] = await Promise.all([
        dashboardAPI.getStats(yearParam, monthParam),
        dashboardAPI.getRecentBills(5),
        dashboardAPI.getRecentPayments(5),
      ]);
      console.log('Stats response:', statsRes.data);
      setStats(statsRes.data.stats);
      setRecentBills(billsRes.data.bills);
      setRecentPayments(paymentsRes.data.payments);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
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
      paid: 'badge-success',
      pending: 'badge-warning',
      confirmed: 'badge-success',
      overdue: 'badge-danger',
    };
    return statusMap[status] || 'badge-secondary';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <p>Memuat data...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="header">
        <h1>Dashboard</h1>
        <p style={{ color: 'var(--text-light)' }}>
          Selamat datang di Sistem Penagihan Air
        </p>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center' }}>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Date(2000, i, 1).toLocaleDateString('id-ID', { month: 'long' })}
            </option>
          ))}
        </select>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
        >
          {Array.from({ length: 5 }, (_, i) => {
            const year = new Date().getFullYear() - 2 + i;
            return (
              <option key={year} value={year}>
                {year}
              </option>
            );
          })}
        </select>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={18} /> Total Pelanggan
          </div>
          <div className="stat-value">{stats?.total_customers || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Receipt size={18} /> Total Tagihan 
          </div>
          <div className="stat-value">{formatCurrency(stats?.bills_this_month || 0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <DollarSign size={18} /> Pendapatan 
          </div>
          <div className="stat-value success">{formatCurrency(stats?.revenue_this_month || 0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={18} /> Tagihan Belum Lunas
          </div>
          <div className="stat-value warning">{stats?.unpaid_bills || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={18} /> Tagihan Jatuh Tempo
          </div>
          <div className="stat-value danger">{stats?.overdue_bills || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={18} /> Sisa Tagihan
          </div>
          <div className="stat-value">{formatCurrency(stats?.sisa_tagih || 0)}</div>
        </div>
      </div>

      {/* Recent Data */}
      <div className="grid grid-2">
        {/* Recent Bills */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Tagihan Terbaru</h3>
            <a href="/bills" className="btn btn-outline btn-sm">Lihat Semua</a>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>No. Tagihan</th>
                  <th>Pelanggan</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentBills.length > 0 ? (
                  recentBills.map((bill) => (
                    <tr key={bill.id}>
                      <td>{bill.bill_number}</td>
                      <td>{bill.customer_name}</td>
                      <td>{formatCurrency(bill.total_amount)}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(bill.status)}`}>
                          {bill.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center" style={{ color: 'var(--text-light)' }}>
                      Tidak ada tagihan
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Payments */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Pembayaran Terbaru</h3>
            <a href="/payments" className="btn btn-outline btn-sm">Lihat Semua</a>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>No. Pembayaran</th>
                  <th>Pelanggan</th>
                  <th>Jumlah</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.length > 0 ? (
                  recentPayments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{payment.payment_number}</td>
                      <td>{payment.customer_name}</td>
                      <td>{formatCurrency(payment.payment_amount)}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(payment.status)}`}>
                          {payment.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center" style={{ color: 'var(--text-light)' }}>
                      Tidak ada pembayaran
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
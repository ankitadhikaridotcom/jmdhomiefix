import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FaBan, FaSearch, FaUserCheck } from 'react-icons/fa';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    axios.get(`${API}/api/admin/users`, { withCredentials: true })
      .then(({ data }) => {
        if (active && data.success) setUsers(data.users || []);
      })
      .catch((error) => toast.error(error.response?.data?.message || 'Failed to load users.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => users.filter((user) => {
    const matchesSearch = `${user.name} ${user.email} ${user.phone}`.toLowerCase().includes(search.toLowerCase());
    const provider = user.providerStatus && user.providerStatus !== 'not_applied';
    const matchesRole = roleFilter === 'all'
      || (roleFilter === 'provider' ? provider || user.role === 'provider' : user.role === roleFilter);
    return matchesSearch && matchesRole;
  }), [users, search, roleFilter]);

  const updateStatus = async (user) => {
    const status = user.accountStatus === 'suspended' ? 'active' : 'suspended';
    try {
      const { data } = await axios.put(
        `${API}/api/admin/users/${user._id}/status`,
        { status },
        { withCredentials: true },
      );
      setUsers((current) => current.map((item) => item._id === user._id
        ? { ...item, accountStatus: data.user.accountStatus }
        : item));
      toast.success(data.message);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update account status.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Account administration</p>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-950">Customers and providers</h1>
        <p className="mt-1 text-sm text-slate-500">{users.length} accounts · Provider applications do not create duplicate accounts.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, email or phone" className="input-field pl-11" />
        </div>
        <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="input-field !w-auto">
          <option value="all">All accounts</option><option value="customer">Customers</option><option value="provider">Provider applicants</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {loading ? (
          <p className="p-10 text-center text-sm text-slate-500">Loading accounts…</p>
        ) : filtered.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-500">No matching accounts.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="px-5 py-4">Account</th><th className="px-5 py-4">Phone</th><th className="px-5 py-4">Mode / application</th><th className="px-5 py-4">Bookings</th><th className="px-5 py-4">Joined</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((user) => {
                  const hasProviderApplication = Boolean(user.providerStatus && user.providerStatus !== 'not_applied');
                  const isLegacyProvider = user.role === 'provider';
                  const accountLabel = isLegacyProvider ? 'Provider account' : user.role === 'admin' ? 'Admin' : 'Customer';
                  return (
                    <tr key={user._id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">{user.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{user.email}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{user.phone || '—'}</td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-800">{accountLabel}</p>
                        {hasProviderApplication && <p className="mt-1 text-xs capitalize text-emerald-700">Provider: {user.providerStatus.replace('_', ' ')}</p>}
                      </td>
                      <td className="px-5 py-4 text-slate-600">{user.bookings || 0}</td>
                      <td className="px-5 py-4 text-slate-500">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${user.accountStatus === 'suspended' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                          {user.accountStatus || 'active'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {user.role !== 'admin' && (
                          <button onClick={() => updateStatus(user)} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold ${user.accountStatus === 'suspended' ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}>
                            {user.accountStatus === 'suspended' ? <FaUserCheck /> : <FaBan />}
                            {user.accountStatus === 'suspended' ? 'Reactivate' : 'Suspend'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageUsers;

import { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FaCheck, FaClock, FaFileAlt, FaMapMarkerAlt, FaTimes, FaUserTie } from 'react-icons/fa';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ManageProviderApplications = () => {
  const [applications, setApplications] = useState([]);
  const [selected, setSelected] = useState(null);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/api/admin/provider-applications`, {
        withCredentials: true,
        params: statusFilter === 'all' ? {} : { status: statusFilter },
      });
      setApplications(data.applications || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load provider applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadApplications(); }, [statusFilter]);

  const review = async (application, status) => {
    if (status === 'rejected' && !rejectionReason.trim()) {
      toast.error('Enter a reason so the applicant knows what to update.');
      return;
    }
    setSaving(true);
    try {
      const { data } = await axios.put(
        `${API}/api/admin/provider-applications/${application._id}/review`,
        { status, reason: rejectionReason.trim() },
        { withCredentials: true },
      );
      setApplications((current) => current.filter((item) => item._id !== application._id));
      setSelected(null);
      setRejecting(false);
      setRejectionReason('');
      toast.success(data.message);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not review this application.');
    } finally {
      setSaving(false);
    }
  };

  const documentLink = (url, label) => url && (
    <a href={`${API}${url}`} target="_blank" rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">
      <FaFileAlt /> {label}
    </a>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Admin review</p>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-950">Provider applications</h1>
          <p className="mt-1 text-sm text-slate-500">Review applicant details and documents before enabling provider access.</p>
        </div>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="input-field !w-auto">
          <option value="pending">Pending review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="all">All applications</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">Loading applications…</div>
        ) : applications.length === 0 ? (
          <div className="p-12 text-center">
            <FaUserTie className="mx-auto text-3xl text-slate-300" />
            <p className="mt-3 font-semibold text-slate-800">No applications in this view</p>
            <p className="mt-1 text-sm text-slate-500">New provider applications will appear here for review.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="px-5 py-4">Applicant</th><th className="px-5 py-4">Services</th><th className="px-5 py-4">Location</th><th className="px-5 py-4">Submitted</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Review</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applications.map((application) => (
                  <tr key={application._id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">{application.data?.fullName || application.user?.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{application.user?.email}</p>
                    </td>
                    <td className="max-w-56 px-5 py-4 text-slate-600">{application.data?.categories?.join(', ') || '—'}</td>
                    <td className="px-5 py-4 text-slate-600">{application.data?.city || '—'}, {application.data?.state || ''}</td>
                    <td className="px-5 py-4 text-slate-500">{application.updatedAt ? new Date(application.updatedAt).toLocaleDateString() : '—'}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${application.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : application.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                        <FaClock /> {application.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button onClick={() => { setSelected(application); setRejecting(false); setRejectionReason(''); }}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100">Review details</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="application-title">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Application review</p>
                <h2 id="application-title" className="mt-1 text-2xl font-extrabold text-slate-950">{selected.data?.fullName || selected.user?.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{selected.user?.email} · {selected.data?.phone}</p>
              </div>
              <button onClick={() => setSelected(null)} aria-label="Close application" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><FaTimes /></button>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                ['Date of birth', selected.data?.dateOfBirth],
                ['Services', selected.data?.categories?.join(', ')],
                ['Skills', selected.data?.skills],
                ['Experience', `${selected.data?.experience || 0} years`],
                ['Previous work', selected.data?.previousWork],
                ['Certifications', selected.data?.certifications || 'Not provided'],
                ['Location', `${selected.data?.city}, ${selected.data?.state} ${selected.data?.pincode}`],
                ['Service areas', selected.data?.areas],
                ['Service radius', `${selected.data?.radius} km`],
                ...(selected.data?.price ? [['Pricing', `₹${selected.data?.price} (${selected.data?.pricingModel || 'fixed'})`]] : []),
                ['Availability', `${selected.data?.workingDays?.join(', ')} · ${selected.data?.timeSlots}`],
                ['Government ID', `${selected.data?.govtIdType}: ${selected.data?.govtIdNumber}`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
                  <p className="mt-1 break-words text-sm text-slate-800">{value || '—'}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {documentLink(selected.data?.govtIdDocument, 'Government ID')}
              {documentLink(selected.data?.workProof, 'Work experience proof')}
              {selected.data?.profilePhoto && <a href={selected.data.profilePhoto} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"><FaMapMarkerAlt /> Profile photo</a>}
            </div>
            {selected.status === 'pending' && (
              <div className="mt-6 border-t border-slate-100 pt-5">
                {rejecting && (
                  <label className="mb-4 block text-sm font-semibold text-slate-700">
                    Reason for rejection
                    <textarea value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} rows={3} maxLength={1000}
                      className="input-field mt-1.5 resize-y" placeholder="Explain what needs to be corrected before applying again." />
                  </label>
                )}
                <div className="flex flex-wrap justify-end gap-2">
                  {!rejecting ? (
                    <>
                      <button onClick={() => setRejecting(true)} className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-50"><FaTimes /> Reject</button>
                      <button onClick={() => review(selected, 'approved')} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-900 disabled:opacity-60"><FaCheck /> Approve</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setRejecting(false)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
                      <button onClick={() => review(selected, 'rejected')} disabled={saving} className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-60">Confirm rejection</button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageProviderApplications;

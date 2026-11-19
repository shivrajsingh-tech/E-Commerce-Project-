import { useEffect, useState } from "react";
import { Save, User, Shield, Lock } from "lucide-react";
import toast from 'react-hot-toast';
import api from "../api/api";

const Settings = () => {
  const [activeTab, setActiveTab] = useState("profile");

  // ================= PROFILE =================

  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ================= PASSWORD =================

  const [password, setPassword] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [changingPassword, setChangingPassword] = useState(false);

  // ================= GET PROFILE =================

  const getProfile = async () => {
    try {
      setLoading(true);

      const response = await api.get("/auth/me");

      if (response.data.success) {
        const user = response.data.user;

        setProfile({
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          email: user.email || "",
          phone: user.phone || "",
        });
      }
    } catch (error) {
      console.log(
        error.response?.data?.message || "Failed to fetch profile"
      );
    } finally {
      setLoading(false);
    }
  };

  // ================= USE EFFECT =================

  useEffect(() => {
    getProfile();
  }, []);

  // ================= PROFILE CHANGE =================

  const handleProfileChange = (e) => {
    setProfile((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // ================= UPDATE PROFILE =================

  const handleProfileSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);

      // Email update payload se hata diya gaya hai
      const response = await api.put("/auth/profile", {
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
      });

      if (response.data.success) {
        toast.success(response.data.message || "Profile updated successfully");

        await getProfile();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  // ================= PASSWORD CHANGE =================

  const handlePasswordChange = (e) => {
    setPassword((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // ================= CHANGE PASSWORD =================

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (password.newPassword !== password.confirmPassword) {
      toast.error("Passwords do not match"); return;
      return;
    }

    if (password.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters"); return;
      return;
    }

    try {
      setChangingPassword(true);

      const response = await api.put("/auth/change-password", {
        currentPassword: password.currentPassword,
        newPassword: password.newPassword,
      });

      if (response.data.success) {
        toast.success(response.data.message || "Password changed successfully");

        setPassword({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="p-6">
      {/* ================= HEADER ================= */}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Settings</h1>

        <p className="text-gray-500 text-sm mt-1">
          Manage your account settings
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ================= SIDEBAR ================= */}

        <div className="bg-white rounded-xl shadow-sm p-3 h-fit">
          <button
            onClick={() => setActiveTab("profile")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left ${
              activeTab === "profile"
                ? "bg-indigo-50 text-indigo-600"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <User size={18} />
            Profile
          </button>

          <button
            onClick={() => setActiveTab("security")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left ${
              activeTab === "security"
                ? "bg-indigo-50 text-indigo-600"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Shield size={18} />
            Security
          </button>
        </div>

        {/* ================= CONTENT ================= */}

        <div className="lg:col-span-3">
          {/* ================= PROFILE ================= */}

          {activeTab === "profile" && (
            <div className="bg-white rounded-xl shadow-sm">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-800">
                  Profile Settings
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Update your profile information
                </p>
              </div>

              {loading ? (
                <div className="p-10 text-center text-gray-500">
                  Loading profile...
                </div>
              ) : (
                <form onSubmit={handleProfileSubmit} className="p-6 space-y-5">
                  {/* FIRST + LAST NAME */}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name
                      </label>

                      <input
                        type="text"
                        name="firstName"
                        value={profile.firstName}
                        onChange={handleProfileChange}
                        required
                        className="w-full border rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name
                      </label>

                      <input
                        type="text"
                        name="lastName"
                        value={profile.lastName}
                        onChange={handleProfileChange}
                        className="w-full border rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* EMAIL (READ-ONLY / DISABLED) */}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>

                    <div className="relative">
                      <input
                        type="email"
                        name="email"
                        value={profile.email}
                        disabled
                        readOnly
                        className="w-full border border-gray-200 bg-gray-100 text-gray-500 rounded-lg px-3 py-2.5 outline-none cursor-not-allowed select-none"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                        Cannot be changed
                      </span>
                    </div>

                    <p className="text-xs text-gray-400 mt-1">
                      Email address is linked to your login credentials and cannot be edited.
                    </p>
                  </div>

                  {/* PHONE */}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>

                    <input
                      type="text"
                      name="phone"
                      value={profile.phone}
                      onChange={handleProfileChange}
                      className="w-full border rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* SAVE */}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      <Save size={17} />

                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ================= SECURITY ================= */}

          {activeTab === "security" && (
            <div className="bg-white rounded-xl shadow-sm">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-800">
                  Security
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Manage your account security
                </p>
              </div>

              <form onSubmit={handlePasswordSubmit} className="p-6 space-y-5">
                {/* CURRENT PASSWORD */}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password
                  </label>

                  <div className="relative">
                    <Lock
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                      type="password"
                      name="currentPassword"
                      value={password.currentPassword}
                      onChange={handlePasswordChange}
                      required
                      placeholder="Enter current password"
                      className="w-full border rounded-lg pl-10 pr-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* NEW PASSWORD */}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>

                  <div className="relative">
                    <Lock
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                      type="password"
                      name="newPassword"
                      value={password.newPassword}
                      onChange={handlePasswordChange}
                      required
                      placeholder="Enter new password"
                      className="w-full border rounded-lg pl-10 pr-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* CONFIRM PASSWORD */}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password
                  </label>

                  <div className="relative">
                    <Lock
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                      type="password"
                      name="confirmPassword"
                      value={password.confirmPassword}
                      onChange={handlePasswordChange}
                      required
                      placeholder="Confirm new password"
                      className="w-full border rounded-lg pl-10 pr-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* CHANGE PASSWORD */}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <Shield size={17} />

                    {changingPassword ? "Changing..." : "Change Password"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
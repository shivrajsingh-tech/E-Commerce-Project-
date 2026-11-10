import Sidebar from "./SideBar";

const AdminLayout = ({ children }) => {
    return (
        <div className="min-h-screen bg-slate-50">

            <Sidebar />

            <div className="ml-64 min-h-screen">

                <main className="p-4 sm:p-6">
                    {children}
                </main>

            </div>

        </div>
    );
};

export default AdminLayout;
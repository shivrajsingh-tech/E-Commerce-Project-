import { Bell } from "lucide-react";

const Header = () => {
    return (
        <header className="h-20 bg-white border-b flex items-center justify-between px-8">

            {/* LEFT */}

            <div>
                <h1 className="text-xl font-bold text-slate-900">
                    Super Admin Panel
                </h1>

                <p className="text-sm text-slate-500">
                    Master control for ShopNest platform
                </p>
            </div>


            {/* RIGHT */}

            <div className="flex items-center gap-5">

                {/* Notification */}

                <button
                    type="button"
                    className="relative p-2 rounded-lg hover:bg-slate-100"
                    aria-label="Notifications"
                >
                    <Bell
                        size={20}
                        className="text-slate-600"
                    />

                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full"></span>
                </button>


                {/* Super Admin */}

                <div className="flex items-center gap-3">

                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                        SA
                    </div>

                    <div className="hidden sm:block">
                        <p className="text-sm font-semibold text-slate-800">
                            Super Admin
                        </p>

                        <p className="text-xs text-slate-500">
                            Root System Authority
                        </p>
                    </div>

                </div>

            </div>

        </header>
    );
};

export default Header;
import Sidebar from '../Sidebar/Sidebar';
import Navbar from '../Navbar/Navbar';
import './MainLayout.css';

function MainLayout({ children }) {
  return (
    <div className="main-layout-container">
      <Sidebar />

      <div className="main-layout-right">
        <Navbar />

        <main className="main-content-area">
          {children}
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
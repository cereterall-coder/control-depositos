import DashboardLayout from '../components/DashboardLayout';

const AdminUsers = () => {
    return (
        <DashboardLayout title="Admin Debug">
            <div style={{ padding: '2rem', color: 'white' }}>
                <h1>Panel de Admin (Debug Mode)</h1>
                <p>Si ves esto, el problema estaba en la lógica de carga de usuarios.</p>
                <p>El sistema funciona, pero algo en la consulta de base de datos o el bucle de efectos estaba causando el bloqueo.</p>
            </div>
        </DashboardLayout>
    );
};

export default AdminUsers;

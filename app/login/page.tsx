import LoginButtons from '../../components/LoginButtons'
import AppShell from '../../components/AppShell'

export default function LoginPage() {
  return (
    <AppShell
      title="Entrar"
      subtitle="Faça login com Google para acessar o perfil, enviar pedidos de assinatura e liberar o menu Admin na conta do administrador."
    >
      <div className="grid grid-2">
        <div
          className="card"
          style={{
            background:
              'linear-gradient(135deg, rgba(124,58,237,0.22), rgba(37,99,235,0.16)), var(--card)',
          }}
        >
          <div style={{ display: 'grid', gap: 14 }}>
            <span className="badge public" style={{ width: 'fit-content' }}>
              Acesso à conta
            </span>
            <h2 style={{ margin: 0 }}>Login restaurado</h2>
            <p className="muted" style={{ margin: 0, lineHeight: 1.7 }}>
              Esta página agora volta a existir como ponto oficial de entrada. Depois do login,
              o topo do site mostra o estado da sua conta e libera o botão Admin automaticamente
              quando o e-mail for o administrador cadastrado.
            </p>
            <ul className="info-list">
              <li>Perfil e histórico do usuário</li>
              <li>Pedidos da área VIP</li>
              <li>Login persistente no menu superior</li>
              <li>Detecção automática de administrador</li>
            </ul>
          </div>
        </div>

        <div className="card" style={{ maxWidth: 620 }}>
          <h3 style={{ marginTop: 0 }}>Entrar na plataforma</h3>
          <p className="muted" style={{ lineHeight: 1.7 }}>
            Use o mesmo e-mail configurado no Supabase Auth. Se o login do Google já estiver
            habilitado no projeto, o botão abaixo abre o fluxo completo e retorna para a própria
            plataforma.
          </p>
          <div style={{ marginTop: 20 }}>
            <LoginButtons />
          </div>
        </div>
      </div>
    </AppShell>
  )
}

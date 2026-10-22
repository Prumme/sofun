import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, AudioLines, Check, CheckCircle2, ChevronRight, CircleAlert, Gamepad2, Lightbulb, LoaderCircle, Monitor, Moon, PencilRuler, Radio, Smartphone, Sparkles, Users, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { createRealtimeClient } from '@/lib/realtime/client';
const samples = [
  { id: 'quiz', name: 'Quiz', category: 'CULTURE & INTUITION', description: 'Les bonnes réponses. Les mauvaises certitudes.', icon: Lightbulb, accent: 'violet', players: '3–12 joueurs' },
  { id: 'music', name: 'Blind test', category: 'MUSIQUE & SOUVENIRS', description: 'Quelques notes suffisent à lancer le débat.', icon: AudioLines, accent: 'cyan', players: '2–12 joueurs' },
  { id: 'draw', name: 'À vos crayons', category: 'DESSIN & IMAGINATION', description: 'Un trait de génie. Ou presque.', icon: PencilRuler, accent: 'pink', players: '3–8 joueurs' },
] as const;
export function DesignWorkshop() {
  const [connected, setConnected] = useState(false);
  const [selected, setSelected] = useState<string>('quiz');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const client = createRealtimeClient(setConnected, undefined, { resumeSession: false });
    client.connect();
    return () => { client.disconnect(); if (timer.current) clearTimeout(timer.current); };
  }, []);
  const invalid = submitted && !name.trim();
  function simulate() {
    setLoading(true); setDone(false);
    timer.current = setTimeout(() => { setLoading(false); setDone(true); }, 900);
  }
  return <>
    <a className="skip-link" href="#main">Aller au contenu</a>
    <header className="site-header"><div className="container header-inner">
      <a href="/" className="brand" aria-label="Party Games, accueil"><span className="brand-mark"><Gamepad2 size={22}/></span>party<span className="brand-light">games</span><span className="brand-dot">.</span></a>
      <nav aria-label="Navigation principale"><a className="nav-active" href="#components">Atelier UI</a><a href="#games">Cartes de jeux</a></nav>
      <span className="version"><span className="dot"/> DESIGN SYSTEM · 01</span>
    </div></header>
    <main id="main" className="container">
      <section className="hero" aria-labelledby="title">
        <div><div className="eyebrow"><span className="line"/> UN ÉCRAN. TOUTE LA SOIRÉE.</div>
          <h1 id="title">Le jeu commence<br/>avec <span>vous.</span></h1>
          <p className="hero-copy">Un univers sobre. Une touche de lumière.<br/>Et de la place pour les bons moments.</p>
          <Button asChild><a href="#components">Explorer les composants <ArrowDown size={17}/></a></Button>
        </div>
        <Card className="hero-card"><div className="preview-top"><span className="mini-label">L’ESPRIT PARTY GAMES</span><Sparkles size={17}/></div>
          <div className="orbit"><span className="orbit-icon"><Gamepad2 size={48} strokeWidth={1.3}/></span><span className="orbit-small"><Smartphone size={19}/></span></div>
          <h2>Ensemble, simplement.</h2><p>Un écran partagé, vos téléphones.<br/>Le reste se passe autour de vous.</p>
          <div className="preview-bottom"><span><Monitor size={15}/> Écran partagé</span><span><Smartphone size={15}/> Mobile</span></div>
        </Card>
      </section>
      <div className="workshop-note"><span><PencilRuler size={16}/> Atelier de composants</span><p>Une démonstration interactive pour valider l’identité visuelle. Les jeux présentés sont des exemples.</p><span className="small-pill">V1 · Fondations</span></div>
      <section id="games" className="section" aria-labelledby="games-title">
        <div className="section-header"><div><div className="eyebrow">01 / EXPLORER</div><h2 id="games-title">Une personnalité par jeu.</h2><p>Des cartes discrètes, des icônes qui donnent le ton.</p></div><span className="section-hint">Sélectionnez une carte <ArrowRight size={16}/></span></div>
        <div className="game-grid">{samples.map(game => <button key={game.id} type="button" aria-pressed={selected === game.id} onClick={() => setSelected(game.id)} className={`game-card accent-${game.accent} ${selected === game.id ? 'selected' : ''}`}>
          <div className="game-top"><span className="game-icon"><game.icon size={30} strokeWidth={1.5}/></span><span className="selection-mark" aria-hidden="true">{selected === game.id ? <Check size={15}/> : <ChevronRight size={17}/>}</span></div>
          <span className="game-category">{game.category}</span><h3>{game.name}</h3><p>{game.description}</p><span className="game-footer"><span><Users size={14}/>{game.players}</span><span>Exemple</span></span>
        </button>)}</div>
      </section>
      <section id="components" className="section" aria-labelledby="components-title">
        <div className="section-header"><div><div className="eyebrow">02 / INTERAGIR</div><h2 id="components-title">Le détail fait l’expérience.</h2><p>Des gestes simples et des retours toujours clairs.</p></div></div>
        <div className="component-grid">
          <Card className="component-panel"><div className="panel-title"><span>Boutons & actions</span><span className="mini-label">01</span></div><p>Une action principale, juste ce qu’il faut d’éclat.</p>
            <div className="button-row"><Button onClick={simulate} disabled={loading} aria-busy={loading}>{loading ? <LoaderCircle size={17} className="spin"/> : done ? <Check size={17}/> : <ArrowRight size={17}/>} {loading ? 'Chargement…' : done ? 'C’est prêt !' : 'Tester une action'}</Button><Button variant="secondary" onClick={() => { setDone(false); setSubmitted(false); setName(''); }}>Réinitialiser</Button></div>
            <div className="button-row"><Button disabled>Indisponible</Button><Button variant="ghost" asChild><a href="#states">Voir les états <ArrowRight size={15}/></a></Button></div>
            <div className="feedback-slot" role="status">{done ? <span className="success-text"><CheckCircle2 size={16}/> Action de démonstration terminée.</span> : <span className="muted">Essayez aussi la navigation au clavier.</span>}</div>
          </Card>
          <Card className="component-panel"><div className="panel-title"><span>Champs & validation</span><span className="mini-label">02</span></div><p>Du contraste, de l’espace et un focus bien visible.</p>
            <form onSubmit={event => { event.preventDefault(); setSubmitted(true); }} noValidate>
              <label htmlFor="nickname">Votre pseudo <span className="muted">· démonstration</span></label><div className="form-row"><Input id="nickname" placeholder="Comment vous appelle-t-on ?" value={name} maxLength={32} onChange={event => { setName(event.target.value); setSubmitted(false); }} aria-invalid={invalid} aria-describedby="name-feedback"/><Button type="submit" variant="secondary" size="icon" aria-label="Valider le pseudo"><ArrowRight size={18}/></Button></div>
              <div id="name-feedback" className="field-feedback" aria-live="polite">{invalid ? <span className="error-text"><CircleAlert size={15}/> Saisissez un pseudo pour continuer.</span> : submitted ? <span className="success-text"><CheckCircle2 size={15}/> Parfait, {name.trim()}.</span> : <span className="muted">Aucune room ne sera créée.</span>}</div>
              <label htmlFor="disabled-code">Code de room <span className="muted">· désactivé</span></label><Input id="disabled-code" placeholder="ABC234" disabled/>
            </form>
          </Card>
        </div>
      </section>
      <section id="states" className="section states-section" aria-labelledby="states-title"><div><div className="eyebrow">03 / RESSENTIR</div><h2 id="states-title">Toujours savoir où l’on en est.</h2><p>Les états s’expriment en mots, autant qu’en couleurs.</p></div><Card className="state-card"><div className="connection-line"><span className={`state-icon ${connected ? 'success-text' : 'warning-text'}`}>{connected ? <Wifi size={21}/> : <WifiOff size={21}/>}</span><div><strong data-testid="connection-status">{connected ? 'Serveur connecté' : 'Connexion en cours'}</strong><p>Connexion réelle au serveur local.</p></div><span className={`status-pill ${connected ? 'is-online' : ''}`}>{connected ? 'En ligne' : 'Hors ligne'}</span></div><div className="state-samples"><span className="success-text"><CheckCircle2 size={15}/> Validé</span><span className="warning-text"><Radio size={15}/> En attente</span><span className="error-text"><CircleAlert size={15}/> À corriger</span></div></Card></section>
      <footer><a href="/" className="brand small">partygames<span className="brand-dot">.</span></a><span>Moins d’effets. Plus de moments.</span><span><Moon size={14}/> Sombre par nature</span></footer>
    </main>
  </>;
}

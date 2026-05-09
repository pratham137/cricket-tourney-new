import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const ADMIN_PW = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'cricket2026'

const G = {
  card: {background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:12,padding:'20px'},
  btn: {background:'#1D9E75',color:'#fff',border:'none',borderRadius:8,padding:'9px 18px',fontSize:14,fontWeight:600,cursor:'pointer'} as any,
  ghost: {background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.7)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'7px 14px',fontSize:13,cursor:'pointer'} as any,
  label: {fontSize:11,color:'rgba(255,255,255,0.4)',fontWeight:500,display:'block',marginBottom:6,textTransform:'uppercase' as const,letterSpacing:'0.06em'},
  input: {background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:8,color:'#f0f4f2',padding:'8px 12px',fontSize:14,width:'100%',outline:'none',fontFamily:'inherit'},
}

type Team={id:string;name:string;short_name:string;color:string}
type Player={id:string;team_id:string;name:string;role:string;is_captain:boolean;is_keeper:boolean;is_substitute:boolean}
type Match={id:string;label:string;team1_id:string;team2_id:string;match_date:string|null;overs:number;status:string;toss_winner_id:string|null;toss_choice:string|null;batting_first_id:string|null;current_innings:number;inn1_runs:number;inn1_wickets:number;inn1_overs:number;inn1_balls:number;inn2_runs:number;inn2_wickets:number;inn2_overs:number;inn2_balls:number;winner_id:string|null;win_margin:string|null;team1?:Team;team2?:Team}

type Tab='matches'|'teams'|'players'|'scorer'
type ScorerState={match:Match;balls:any[]}

export default function Admin() {
  const [authed,setAuthed]=useState(false)
  const [pw,setPw]=useState('')
  const [err,setErr]=useState('')
  const [tab,setTab]=useState<Tab>('matches')
  const [teams,setTeams]=useState<Team[]>([])
  const [matches,setMatches]=useState<Match[]>([])
  const [players,setPlayers]=useState<Player[]>([])
  const [scorer,setScorer]=useState<ScorerState|null>(null)

  useEffect(()=>{ if(typeof window!=='undefined'&&sessionStorage.getItem('adm')==='1') setAuthed(true) },[])

  const loadAll=useCallback(async()=>{
    const [{ data:t },{ data:m },{ data:p }]=await Promise.all([
      sb.from('teams').select('*').order('name'),
      sb.from('matches').select('*, team1:team1_id(*), team2:team2_id(*)').order('created_at'),
      sb.from('players').select('*').order('name'),
    ])
    setTeams((t||[]) as Team[])
    setMatches((m||[]) as Match[])
    setPlayers((p||[]) as Player[])
  },[])

  useEffect(()=>{ if(authed) loadAll() },[authed,loadAll])

  function login(){
    if(pw===ADMIN_PW){setAuthed(true);sessionStorage.setItem('adm','1')}
    else{setErr('Wrong password');setTimeout(()=>setErr(''),2000)}
  }

  const tabStyle=(t:string)=>({padding:'8px 16px',borderRadius:6,fontSize:13,fontWeight:500,cursor:'pointer',border:'none',background:tab===t?'rgba(29,158,117,0.2)':'transparent',color:tab===t?'#1D9E75':'rgba(255,255,255,0.5)'})

  async function openScorer(m:Match){
    const {data:bs}=await sb.from('balls').select('*').eq('match_id',m.id).order('innings').order('over_number').order('ball_number')
    setScorer({match:m,balls:(bs||[])})
    setTab('scorer')
  }

  if(!authed) return (
    <div style={{minHeight:'100vh',background:'#070d0a',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{...G.card,width:340}}>
        <div style={{textAlign:'center',fontSize:32,marginBottom:12}}>🔐</div>
        <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:24,textAlign:'center',marginBottom:20}}>Admin Login</div>
        {err&&<div style={{background:'rgba(226,75,74,0.15)',border:'1px solid rgba(226,75,74,0.3)',borderRadius:8,padding:'8px 12px',fontSize:13,color:'#F09595',marginBottom:12}}>{err}</div>}
        <input type="password" placeholder="Password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()} style={{...G.input,marginBottom:12}}/>
        <button style={{...G.btn,width:'100%',justifyContent:'center'}} onClick={login}>Sign In</button>
        <div style={{textAlign:'center',marginTop:10,fontSize:12,color:'rgba(255,255,255,0.3)'}}>Default: cricket2026</div>
        <div style={{textAlign:'center',marginTop:6}}><Link href="/"><span style={{fontSize:12,color:'rgba(255,255,255,0.3)'}}>← Scoreboard</span></Link></div>
      </div>
    </div>
  )

  if(tab==='scorer'&&scorer) return (
    <Scorer
      match={scorer.match}
      balls={scorer.balls}
      players={players.filter(p=>p.team_id===scorer.match.team1_id||p.team_id===scorer.match.team2_id)}
      onBack={()=>{ setScorer(null); setTab('matches'); loadAll() }}
      onRefresh={async(m)=>{ const {data:bs}=await sb.from('balls').select('*').eq('match_id',m.id).order('innings').order('over_number').order('ball_number'); setScorer({match:m,balls:(bs||[])}) }}
    />
  )

  return (
    <div style={{minHeight:'100vh',background:'#070d0a'}}>
      <div style={{background:'rgba(0,0,0,0.6)',borderBottom:'1px solid rgba(255,255,255,0.06)',position:'sticky',top:0,zIndex:50,backdropFilter:'blur(12px)'}}>
        <div style={{maxWidth:960,margin:'0 auto',padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <Link href="/"><span style={G.ghost}>← Scoreboard</span></Link>
            <span style={{fontFamily:'Bebas Neue,sans-serif',fontSize:24,letterSpacing:'0.05em'}}>ADMIN PANEL</span>
          </div>
          <button style={G.ghost} onClick={()=>{sessionStorage.removeItem('adm');setAuthed(false)}}>Log out</button>
        </div>
        <div style={{maxWidth:960,margin:'0 auto',padding:'0 16px 8px',display:'flex',gap:2}}>
          {(['matches','teams','players'] as Tab[]).map(t=>(
            <button key={t} style={tabStyle(t)} onClick={()=>setTab(t)}>
              {t==='matches'?'🗓 Matches':t==='teams'?'👥 Teams':'🏏 Players'}
            </button>
          ))}
        </div>
      </div>
      <div style={{maxWidth:960,margin:'0 auto',padding:'24px 16px'}}>
        {tab==='matches'&&<MatchesTab teams={teams} matches={matches} onRefresh={loadAll} onScore={openScorer}/>}
        {tab==='teams'&&<TeamsTab teams={teams} onRefresh={loadAll}/>}
        {tab==='players'&&<PlayersTab teams={teams} players={players} onRefresh={loadAll}/>}
      </div>
    </div>
  )
}

// ── Teams Tab ──────────────────────────────────────────────────────
function TeamsTab({teams,onRefresh}:{teams:Team[];onRefresh:()=>void}) {
  const [name,setName]=useState(''),[ short,setShort]=useState(''),[ color,setColor]=useState('#1D9E75'),[msg,setMsg]=useState('')
  async function add(){
    if(!name.trim()||!short.trim()) return
    const {error}=await sb.from('teams').insert({name:name.trim(),short_name:short.trim().toUpperCase(),color})
    if(!error){setName('');setShort('');setMsg('Team added!');setTimeout(()=>setMsg(''),2000);onRefresh()}
  }
  async function del(id:string){
    if(!confirm('Delete team and all their players?')) return
    await sb.from('players').delete().eq('team_id',id)
    await sb.from('teams').delete().eq('id',id)
    onRefresh()
  }
  return (
    <div>
      <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:22,letterSpacing:'0.05em',marginBottom:16}}>Manage Teams</div>
      {msg&&<Alert text={msg} type="success"/>}
      <div style={{...G.card,marginBottom:20}}>
        <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:18,marginBottom:14}}>Add Team</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 120px 70px auto',gap:10,alignItems:'end'}}>
          <div><label style={G.label}>Team Name</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Team Alpha" style={G.input}/></div>
          <div><label style={G.label}>Short (3-4)</label><input value={short} onChange={e=>setShort(e.target.value)} placeholder="TMA" maxLength={4} style={G.input}/></div>
          <div><label style={G.label}>Color</label><input type="color" value={color} onChange={e=>setColor(e.target.value)} style={{...G.input,height:38,padding:'2px 4px',cursor:'pointer'}}/></div>
          <button style={G.btn} onClick={add}>Add</button>
        </div>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {teams.map(t=>(
          <div key={t.id} style={{...G.card,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 18px'}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:12,height:12,borderRadius:'50%',background:t.color}}/>
              <div>
                <div style={{fontWeight:600,fontSize:15}}>{t.name}</div>
                <div style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>{t.short_name}</div>
              </div>
            </div>
            <button onClick={()=>del(t.id)} style={{background:'rgba(226,75,74,0.1)',border:'1px solid rgba(226,75,74,0.2)',color:'#F09595',borderRadius:6,padding:'5px 12px',fontSize:12,cursor:'pointer'}}>Delete</button>
          </div>
        ))}
        {teams.length===0&&<div style={{textAlign:'center',color:'rgba(255,255,255,0.3)',padding:'40px 0',fontSize:14}}>No teams yet</div>}
      </div>
    </div>
  )
}

// ── Players Tab ─────────────────────────────────────────────────────
function PlayersTab({teams,players,onRefresh}:{teams:Team[];players:Player[];onRefresh:()=>void}) {
  const [teamId,setTeamId]=useState(''),[ name,setName]=useState(''),[ role,setRole]=useState('')
  const [isCap,setIsCap]=useState(false),[ isKeep,setIsKeep]=useState(false),[ isSub,setIsSub]=useState(false),[msg,setMsg]=useState('')
  async function add(){
    if(!teamId||!name.trim()) return
    const {error}=await sb.from('players').insert({team_id:teamId,name:name.trim(),role:role.trim(),is_captain:isCap,is_keeper:isKeep,is_substitute:isSub})
    if(!error){setName('');setRole('');setIsCap(false);setIsKeep(false);setIsSub(false);setMsg('Player added!');setTimeout(()=>setMsg(''),2000);onRefresh()}
  }
  async function del(id:string){ await sb.from('players').delete().eq('id',id); onRefresh() }
  const ROLES=['Specialist batsman','Pace-bowling all-rounder','Spin all-rounder','Specialist bowler','Wicket keeper / Off-spin','Captain / Pace-bowling all-rounder','Pace all-rounder','Fast all-rounder','Other']
  return (
    <div>
      <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:22,letterSpacing:'0.05em',marginBottom:16}}>Manage Players</div>
      {msg&&<Alert text={msg} type="success"/>}
      <div style={{...G.card,marginBottom:20}}>
        <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:18,marginBottom:14}}>Add Player</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:10}}>
          <div><label style={G.label}>Team</label>
            <select value={teamId} onChange={e=>setTeamId(e.target.value)} style={G.input}>
              <option value="">Select team...</option>
              {teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div><label style={G.label}>Player Name</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" style={G.input}/></div>
          <div><label style={G.label}>Role</label>
            <select value={role} onChange={e=>setRole(e.target.value)} style={G.input}>
              <option value="">Select role...</option>
              {ROLES.map(r=><option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <div style={{display:'flex',gap:16,marginBottom:14,flexWrap:'wrap'}}>
          {([['Captain',isCap,setIsCap],['Wicket Keeper',isKeep,setIsKeep],['Substitute',isSub,setIsSub]] as any[]).map(([l,v,s])=>(
            <label key={l} style={{display:'flex',alignItems:'center',gap:6,fontSize:13,color:'rgba(255,255,255,0.6)',cursor:'pointer'}}>
              <input type="checkbox" checked={v} onChange={(e:any)=>s(e.target.checked)} style={{width:'auto',accentColor:'#1D9E75'}}/>{l}
            </label>
          ))}
        </div>
        <button style={G.btn} onClick={add} disabled={!teamId||!name.trim()}>Add Player</button>
      </div>
      {teams.map(t=>{
        const tp=players.filter(p=>p.team_id===t.id)
        return (
          <div key={t.id} style={{marginBottom:20}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
              <div style={{width:10,height:10,borderRadius:'50%',background:t.color}}/>
              <span style={{fontFamily:'Bebas Neue,sans-serif',fontSize:18}}>{t.name}</span>
              <span style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>{tp.length} players</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:8}}>
              {tp.map(p=>(
                <div key={p.id} style={{...G.card,padding:'10px 14px',display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                  <div>
                    <div style={{fontWeight:500,fontSize:13}}>{p.name}</div>
                    <div style={{fontSize:11,color:'rgba(255,255,255,0.4)',marginTop:2}}>{p.role}</div>
                    <div style={{display:'flex',gap:6,marginTop:3}}>
                      {p.is_captain&&<span style={{fontSize:10,color:'#FAC775'}}>★Cap</span>}
                      {p.is_keeper&&<span style={{fontSize:10,color:'#85B7EB'}}>†Keep</span>}
                      {p.is_substitute&&<span style={{fontSize:10,color:'rgba(255,255,255,0.3)'}}>Sub</span>}
                    </div>
                  </div>
                  <button onClick={()=>del(p.id)} style={{background:'none',border:'none',color:'rgba(240,149,149,0.5)',cursor:'pointer',fontSize:18,padding:0}}>×</button>
                </div>
              ))}
              {tp.length===0&&<div style={{fontSize:12,color:'rgba(255,255,255,0.3)',padding:'8px 0'}}>No players yet</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Matches Tab ─────────────────────────────────────────────────────
function MatchesTab({teams,matches,onRefresh,onScore}:{teams:Team[];matches:Match[];onRefresh:()=>void;onScore:(m:Match)=>void}) {
  const [label,setLabel]=useState(''),[ t1,setT1]=useState(''),[ t2,setT2]=useState('')
  const [date,setDate]=useState(''),[ overs,setOvers]=useState('10'),[msg,setMsg]=useState('')
  async function add(){
    if(!label.trim()||!t1||!t2||t1===t2) return
    const {error}=await sb.from('matches').insert({label:label.trim(),team1_id:t1,team2_id:t2,match_date:date||null,overs:parseInt(overs)||10,status:'upcoming',current_innings:1,inn1_runs:0,inn1_wickets:0,inn1_overs:0,inn1_balls:0,inn2_runs:0,inn2_wickets:0,inn2_overs:0,inn2_balls:0})
    if(!error){setLabel('');setT1('');setT2('');setDate('');setMsg('Match added!');setTimeout(()=>setMsg(''),2000);onRefresh()}
  }
  async function start(m:Match){
    const tw=prompt(`Who won toss?\n1 = ${(m.team1 as any)?.name}\n2 = ${(m.team2 as any)?.name}`)
    if(!tw) return
    const tossId=tw==='1'?m.team1_id:m.team2_id
    const ch=prompt('Bat or field? Type: bat OR field')
    if(!ch||!(ch==='bat'||ch==='field')) return
    const batFirst=ch==='bat'?tossId:(tossId===m.team1_id?m.team2_id:m.team1_id)
    const {data:updated}=await sb.from('matches').update({status:'innings1',toss_winner_id:tossId,toss_choice:ch,batting_first_id:batFirst}).eq('id',m.id).select('*, team1:team1_id(*), team2:team2_id(*)').single()
    if(updated) onScore(updated as Match)
    onRefresh()
  }
  async function del(id:string){
    if(!confirm('Delete match and all ball data?')) return
    await sb.from('balls').delete().eq('match_id',id)
    await sb.from('matches').delete().eq('id',id)
    onRefresh()
  }
  const statusBadge=(s:string)=>{
    const isLive=s==='innings1'||s==='innings2'
    return <span style={{fontSize:11,fontWeight:600,padding:'3px 10px',borderRadius:20,background:isLive?'rgba(226,75,74,0.2)':s==='upcoming'?'rgba(239,159,39,0.15)':'rgba(255,255,255,0.06)',color:isLive?'#F09595':s==='upcoming'?'#FAC775':'rgba(255,255,255,0.4)',border:`1px solid ${isLive?'rgba(226,75,74,0.3)':s==='upcoming'?'rgba(239,159,39,0.25)':'rgba(255,255,255,0.08)'}`}}>{isLive?'🔴 Live':s==='upcoming'?'Upcoming':'Final'}</span>
  }
  return (
    <div>
      <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:22,letterSpacing:'0.05em',marginBottom:16}}>Manage Fixtures</div>
      {msg&&<Alert text={msg} type="success"/>}
      <div style={{...G.card,marginBottom:20}}>
        <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:18,marginBottom:14}}>Add Fixture</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 80px',gap:10,marginBottom:10}}>
          <div><label style={G.label}>Label</label><input value={label} onChange={e=>setLabel(e.target.value)} placeholder="e.g. Match 1 / Final" style={G.input}/></div>
          <div><label style={G.label}>Team 1</label>
            <select value={t1} onChange={e=>setT1(e.target.value)} style={G.input}>
              <option value="">Select...</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div><label style={G.label}>Team 2</label>
            <select value={t2} onChange={e=>setT2(e.target.value)} style={G.input}>
              <option value="">Select...</option>{teams.filter(t=>t.id!==t1).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div><label style={G.label}>Overs</label><input type="number" value={overs} onChange={e=>setOvers(e.target.value)} min={1} max={50} style={G.input}/></div>
        </div>
        <div style={{marginBottom:12}}><label style={G.label}>Date (optional)</label><input type="datetime-local" value={date} onChange={e=>setDate(e.target.value)} style={{...G.input,maxWidth:280}}/></div>
        <button style={G.btn} onClick={add} disabled={!label.trim()||!t1||!t2||t1===t2}>Add Fixture</button>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {matches.map(m=>(
          <div key={m.id} style={{...G.card}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <div>
                <span style={{fontSize:12,color:'rgba(255,255,255,0.4)',fontWeight:500}}>{m.label} · T{m.overs} · </span>
                <span style={{fontWeight:600,fontSize:15}}>{(m.team1 as any)?.name} vs {(m.team2 as any)?.name}</span>
              </div>
              {statusBadge(m.status)}
            </div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {m.status==='upcoming'&&<button style={G.btn} onClick={()=>start(m)}>▶ Start Match</button>}
              {(m.status==='innings1'||m.status==='innings2')&&<button style={G.btn} onClick={()=>onScore(m)}>📊 Score Live</button>}
              <Link href={`/match/${m.id}`}><button style={G.ghost}>View →</button></Link>
              <button onClick={()=>del(m.id)} style={{background:'rgba(226,75,74,0.08)',border:'1px solid rgba(226,75,74,0.15)',color:'rgba(240,149,149,0.7)',borderRadius:6,padding:'7px 12px',fontSize:12,cursor:'pointer'}}>Delete</button>
            </div>
          </div>
        ))}
        {matches.length===0&&<div style={{textAlign:'center',color:'rgba(255,255,255,0.3)',padding:'40px 0',fontSize:14}}>No matches yet</div>}
      </div>
    </div>
  )
}

// ── Live Scorer ─────────────────────────────────────────────────────
function Scorer({match:init,balls:initBalls,players,onBack,onRefresh}:{match:Match;balls:any[];players:Player[];onBack:()=>void;onRefresh:(m:Match)=>void}) {
  const [match,setMatch]=useState<Match>(init)
  const [balls,setBalls]=useState<any[]>(initBalls)
  const [batsmanId,setBatsmanId]=useState(''),[bowlerId,setBowlerId]=useState('')
  const [mode,setMode]=useState<'normal'|'wicket'|'extra'>('normal')
  const [extraType,setExtraType]=useState(''),[extraRuns,setExtraRuns]=useState(0)
  const [dismissalType,setDismissalType]=useState('Caught'),[dismissedId,setDismissedId]=useState('')
  const [saving,setSaving]=useState(false),[msg,setMsg]=useState('')

  const inn=match.current_innings,isInn2=inn===2
  const battingTeamId=isInn2?(match.batting_first_id===match.team1_id?match.team2_id:match.team1_id):match.batting_first_id!
  const bowlingTeamId=battingTeamId===match.team1_id?match.team2_id:match.team1_id
  const batPlayers=players.filter(p=>p.team_id===battingTeamId&&!p.is_substitute)
  const bowlPlayers=players.filter(p=>p.team_id===bowlingTeamId&&!p.is_substitute)
  const cr=isInn2?match.inn2_runs:match.inn1_runs,cw=isInn2?match.inn2_wickets:match.inn1_wickets
  const co=isInn2?match.inn2_overs:match.inn1_overs,cb=isInn2?match.inn2_balls:match.inn1_balls
  const target=isInn2?match.inn1_runs+1:null,need=target?target-match.inn2_runs:null
  const ovLeft=isInn2?(match.overs-match.inn2_overs-match.inn2_balls/6):null
  const curOverBalls=balls.filter(b=>b.innings===inn&&b.over_number===co)
  const isComplete=match.status==='completed'

  const DISMISSALS=['Caught','Bowled','LBW','Run Out','Stumped','Hit Wicket']
  const EXTRAS=['wide','noball','bye','legbye']

  async function recordBall(runs:number){
    if(!batsmanId||!bowlerId||saving) return
    setSaving(true)
    const isWicket=mode==='wicket',isExtra=mode==='extra'
    const eType=isExtra?extraType:null,eRuns=isExtra?extraRuns:0
    const totalRuns=runs+eRuns
    const isLegal=!isExtra||(extraType==='bye'||extraType==='legbye')
    const prevLegal=balls.filter(b=>b.innings===inn&&(!b.extra_type||b.extra_type==='bye'||b.extra_type==='legbye')).length
    const newLegal=prevLegal+(isLegal?1:0)
    const newOvers=Math.floor(newLegal/6),newBallsInOv=newLegal%6
    const wktDelta=isWicket?1:0,runDelta=runs+eRuns
    const innUpdate=isInn2?{inn2_runs:match.inn2_runs+runDelta,inn2_wickets:match.inn2_wickets+wktDelta,inn2_overs:newOvers,inn2_balls:newBallsInOv}:{inn1_runs:match.inn1_runs+runDelta,inn1_wickets:match.inn1_wickets+wktDelta,inn1_overs:newOvers,inn1_balls:newBallsInOv}
    const totalWkts=(isInn2?match.inn2_wickets:match.inn1_wickets)+wktDelta
    const inn1Done=!isInn2&&(totalWkts>=batPlayers.length-1||newLegal>=match.overs*6)
    const inn2Win=isInn2&&target&&(match.inn2_runs+runDelta>=target)
    const inn2Loss=isInn2&&(totalWkts>=batPlayers.length-1||newLegal>=match.overs*6)
    let statusUpdate:any={}
    if(inn1Done){statusUpdate={status:'innings2',current_innings:2};setMsg('✅ Innings 1 done! Starting innings 2...')}
    else if(inn2Win){const wl=batPlayers.length-1-match.inn2_wickets-wktDelta;statusUpdate={status:'completed',winner_id:battingTeamId,win_margin:`${wl} wickets`};setMsg('🏆 Match complete!')}
    else if(inn2Loss){const r1=match.inn1_runs,r2=match.inn2_runs+runDelta;statusUpdate={status:'completed',winner_id:r1>r2?bowlingTeamId:r2>r1?battingTeamId:null,win_margin:r1>r2?`${r1-r2} runs`:r2>r1?`${r2-r1} runs`:'Tie'};setMsg('🏆 Match complete!')}
    await sb.from('balls').insert({match_id:match.id,innings:inn,over_number:co,ball_number:cb,batsman_id:batsmanId,bowler_id:bowlerId,runs,is_wicket:isWicket,dismissal_type:isWicket?dismissalType:null,dismissed_player_id:isWicket?(dismissedId||batsmanId):null,extra_type:eType,extra_runs:eRuns,total_runs:totalRuns})
    const {data:updated}=await sb.from('matches').update({...innUpdate,...statusUpdate}).eq('id',match.id).select('*, team1:team1_id(*), team2:team2_id(*)').single()
    if(updated){setMatch(updated as Match);await onRefresh(updated as Match)}
    const {data:bs}=await sb.from('balls').select('*').eq('match_id',match.id).order('innings').order('over_number').order('ball_number')
    setBalls(bs||[])
    setMode('normal');setExtraType('');setExtraRuns(0);setSaving(false)
    setTimeout(()=>setMsg(''),4000)
  }

  async function undo(){
    const allInnBalls=balls.filter(b=>b.innings===inn)
    if(!allInnBalls.length) return
    const last=allInnBalls[allInnBalls.length-1]
    await sb.from('balls').delete().eq('id',last.id)
    const prev=balls.filter(b=>b.innings===inn&&b.id!==last.id)
    const prevLegal=prev.filter((b:any)=>!b.extra_type||b.extra_type==='bye'||b.extra_type==='legbye').length
    const wktDelta=last.is_wicket?1:0,runDelta=last.total_runs
    const innUpdate=isInn2?{inn2_runs:match.inn2_runs-runDelta,inn2_wickets:match.inn2_wickets-wktDelta,inn2_overs:Math.floor(prevLegal/6),inn2_balls:prevLegal%6}:{inn1_runs:match.inn1_runs-runDelta,inn1_wickets:match.inn1_wickets-wktDelta,inn1_overs:Math.floor(prevLegal/6),inn1_balls:prevLegal%6}
    const {data:updated}=await sb.from('matches').update(innUpdate).eq('id',match.id).select('*, team1:team1_id(*), team2:team2_id(*)').single()
    if(updated) setMatch(updated as Match)
    const {data:bs}=await sb.from('balls').select('*').eq('match_id',match.id).order('innings').order('over_number').order('ball_number')
    setBalls(bs||[])
  }

  function dotLabel(b:any){
    if(b.extra_type){const el=b.extra_type==='wide'?'Wd':b.extra_type==='noball'?'Nb':b.extra_type==='bye'?'B':'Lb';return el+(b.total_runs>0?b.total_runs:'')}
    if(b.is_wicket) return 'W'
    return b.runs===0?'·':String(b.runs)
  }
  function dotColor(b:any){
    if(b.is_wicket) return '#E24B4A'
    if(b.extra_type) return '#A64DD1'
    if(b.runs===6) return '#EF9F27'
    if(b.runs===4) return '#378ADD'
    if(b.runs>0) return '#1D9E75'
    return 'rgba(255,255,255,0.3)'
  }

  const modeBtn=(m:'normal'|'wicket'|'extra',label:string)=>(
    <button onClick={()=>setMode(m)} style={{padding:'8px 16px',borderRadius:8,fontSize:13,fontWeight:500,cursor:'pointer',border:`1px solid ${mode===m?(m==='wicket'?'rgba(226,75,74,0.5)':m==='extra'?'rgba(166,77,209,0.5)':'rgba(29,158,117,0.4)'):'rgba(255,255,255,0.1)'}`,background:mode===m?(m==='wicket'?'rgba(226,75,74,0.2)':m==='extra'?'rgba(166,77,209,0.2)':'rgba(29,158,117,0.2)'):'rgba(255,255,255,0.04)',color:mode===m?(m==='wicket'?'#F09595':m==='extra'?'#C08DE0':'#1D9E75'):'rgba(255,255,255,0.5)'}}>{label}</button>
  )

  return (
    <div style={{minHeight:'100vh',background:'#070d0a'}}>
      <div style={{background:'rgba(0,0,0,0.7)',borderBottom:'1px solid rgba(255,255,255,0.06)',position:'sticky',top:0,zIndex:50,backdropFilter:'blur(12px)'}}>
        <div style={{maxWidth:680,margin:'0 auto',padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <button style={{...G.ghost,fontSize:12}} onClick={onBack}>← Back</button>
          <span style={{fontSize:13,color:'rgba(255,255,255,0.5)',fontWeight:500}}>{match.label} · Inn {inn}</span>
          {!isComplete&&<button style={{...G.ghost,fontSize:12,color:'rgba(240,149,149,0.7)'}} onClick={undo}>↩ Undo</button>}
          {isComplete&&<span style={{fontSize:11,padding:'3px 10px',borderRadius:20,background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.4)'}}>Complete</span>}
        </div>
      </div>
      <div style={{maxWidth:680,margin:'0 auto',padding:'16px'}}>
        {msg&&<div style={{background:'rgba(29,158,117,0.15)',border:'1px solid rgba(29,158,117,0.3)',borderRadius:8,padding:'10px 14px',fontSize:14,color:'#1D9E75',marginBottom:16,fontWeight:500}}>{msg}</div>}
        {isComplete&&(
          <div style={{background:'rgba(29,158,117,0.1)',border:'1px solid rgba(29,158,117,0.2)',borderRadius:12,padding:'20px',textAlign:'center',marginBottom:16}}>
            <div style={{fontSize:32,marginBottom:8}}>🏆</div>
            <div style={{fontSize:18,fontWeight:600}}>Match Complete</div>
            <div style={{fontSize:14,color:'rgba(255,255,255,0.5)',marginTop:6}}>{match.winner_id?`${match.winner_id===match.team1_id?(match.team1 as any)?.name:(match.team2 as any)?.name} won by ${match.win_margin}`:'Tie'}</div>
          </div>
        )}
        {/* Score */}
        <div style={{...G.card,marginBottom:16}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.4)',fontWeight:500,marginBottom:4,textTransform:'uppercase',letterSpacing:'0.06em'}}>{isInn2?'Chasing':'Batting'}</div>
              <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:52,lineHeight:1}}>{cr}/{cw}</div>
              <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginTop:4}}>{co}.{cb} overs</div>
            </div>
            <div style={{textAlign:'right'}}>
              {isInn2&&target&&need!==null&&ovLeft!==null?(
                <>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.4)',fontWeight:500,marginBottom:4,textTransform:'uppercase',letterSpacing:'0.06em'}}>Target {target}</div>
                  <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:52,lineHeight:1,color:'#FAC775'}}>Need {need}</div>
                  <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginTop:4}}>RRR {ovLeft>0?(need/ovLeft).toFixed(2):'∞'}</div>
                </>
              ):(
                <>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.4)',fontWeight:500,marginBottom:4,textTransform:'uppercase',letterSpacing:'0.06em'}}>Overs left</div>
                  <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:52,lineHeight:1,color:'rgba(255,255,255,0.5)'}}>{match.overs-co}</div>
                </>
              )}
            </div>
          </div>
          {curOverBalls.length>0&&(
            <div style={{marginTop:12,paddingTop:12,borderTop:'1px solid rgba(255,255,255,0.06)'}}>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.35)',marginBottom:8,fontWeight:500,textTransform:'uppercase',letterSpacing:'0.06em'}}>This over</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {curOverBalls.map((b:any,i:number)=>(
                  <div key={i} style={{width:32,height:32,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:600,border:`1.5px solid ${dotColor(b)}`,color:dotColor(b),background:`${dotColor(b)}18`}}>{dotLabel(b)}</div>
                ))}
              </div>
            </div>
          )}
        </div>
        {!isComplete&&(
          <>
            {/* Player selectors */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
              <div>
                <label style={G.label}>Batsman on strike</label>
                <select value={batsmanId} onChange={e=>setBatsmanId(e.target.value)} style={G.input}>
                  <option value="">Select batsman...</option>
                  {batPlayers.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={G.label}>Bowler</label>
                <select value={bowlerId} onChange={e=>setBowlerId(e.target.value)} style={G.input}>
                  <option value="">Select bowler...</option>
                  {bowlPlayers.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            {/* Mode */}
            <div style={{display:'flex',gap:8,marginBottom:16}}>
              {modeBtn('normal','Normal')}
              {modeBtn('wicket','⚡ Wicket')}
              {modeBtn('extra','+ Extra')}
            </div>
            {/* Wicket details */}
            {mode==='wicket'&&(
              <div style={{...G.card,marginBottom:16,border:'1px solid rgba(226,75,74,0.2)'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <div><label style={G.label}>Dismissal type</label>
                    <select value={dismissalType} onChange={e=>setDismissalType(e.target.value)} style={G.input}>
                      {DISMISSALS.map(d=><option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div><label style={G.label}>Dismissed player</label>
                    <select value={dismissedId} onChange={e=>setDismissedId(e.target.value)} style={G.input}>
                      <option value="">Batsman on strike</option>
                      {batPlayers.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}
            {/* Extra details */}
            {mode==='extra'&&(
              <div style={{...G.card,marginBottom:16,border:'1px solid rgba(166,77,209,0.2)'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <div><label style={G.label}>Extra type</label>
                    <select value={extraType} onChange={e=>setExtraType(e.target.value)} style={G.input}>
                      <option value="">Select type...</option>
                      {EXTRAS.map(e=><option key={e} value={e}>{e.charAt(0).toUpperCase()+e.slice(1)}</option>)}
                    </select>
                  </div>
                  <div><label style={G.label}>Extra runs</label>
                    <input type="number" value={extraRuns} onChange={e=>setExtraRuns(parseInt(e.target.value)||0)} min={0} max={6} style={G.input}/>
                  </div>
                </div>
              </div>
            )}
            {/* Run buttons */}
            <div>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.4)',fontWeight:500,marginBottom:12,textTransform:'uppercase',letterSpacing:'0.06em'}}>
                {mode==='wicket'?'Runs before wicket':mode==='extra'?'Batsman runs (off bat)':'Runs scored'}
              </div>
              <div style={{display:'flex',gap:12,flexWrap:'wrap',justifyContent:'center',marginBottom:16}}>
                {[0,1,2,3,4,5,6].map(r=>(
                  <button key={r}
                    disabled={saving||!batsmanId||!bowlerId||(mode==='extra'&&!extraType)}
                    onClick={()=>recordBall(r)}
                    style={{width:56,height:56,borderRadius:'50%',border:`2px solid ${r===6?'rgba(239,159,39,0.6)':r===4?'rgba(55,138,221,0.6)':mode==='wicket'?'rgba(226,75,74,0.5)':'rgba(255,255,255,0.15)'}`,background:r===6?'rgba(239,159,39,0.15)':r===4?'rgba(55,138,221,0.15)':mode==='wicket'?'rgba(226,75,74,0.1)':'rgba(255,255,255,0.05)',color:'#f0f4f2',fontSize:20,fontWeight:600,cursor:'pointer',opacity:saving||!batsmanId||!bowlerId||(mode==='extra'&&!extraType)?0.3:1,transition:'all 0.15s'}}
                  >{r}</button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Alert({text,type}:{text:string;type:'success'|'error'}) {
  return <div style={{background:type==='success'?'rgba(29,158,117,0.15)':'rgba(226,75,74,0.15)',border:`1px solid ${type==='success'?'rgba(29,158,117,0.3)':'rgba(226,75,74,0.3)'}`,borderRadius:8,padding:'8px 12px',fontSize:13,color:type==='success'?'#1D9E75':'#F09595',marginBottom:12}}>{text}</div>
}

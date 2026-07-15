"use client";

import { FormEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";

type Tone = "gentle" | "dry" | "sarcastic";
type Panel = "reflection" | "compare" | "cities" | "share" | null;
type WeatherDay = { date:string; condition:string; weatherCode:number; temperatureMax:number; temperatureMin:number; apparentTemperatureMax:number; precipitation:number; sunshineDurationHours:number; windSpeedMax:number };
type Location = { id:string; name:string; admin1?:string; country:string; latitude:number; longitude:number; timezone:string };
type Reflection = { planned:number; completed:number; activity:string; outside:boolean; rating:number; note:string };

const TOKYO: Location = { id:"hefei-cn", name:"合肥", country:"中国", latitude:31.82, longitude:117.23, timezone:"Asia/Shanghai" };
const fallbackDays: WeatherDay[] = [
  { date:"2026-07-14", condition:"晴间多云", weatherCode:2, temperatureMax:29, temperatureMin:23, apparentTemperatureMax:31, precipitation:0, sunshineDurationHours:7.8, windSpeedMax:14 },
  { date:"2026-07-13", condition:"小雨", weatherCode:61, temperatureMax:26, temperatureMin:22, apparentTemperatureMax:28, precipitation:4.2, sunshineDurationHours:2.1, windSpeedMax:18 },
];
const copy: Record<Tone,string[]> = {
  gentle:["昨天的阳光没有被浪费，\n只是照在了别的地方。","没去的地方还在那里。\n今天也可以慢一点。","昨天已经很努力地成为昨天了。"],
  dry:["天气给足了机会，\n你没有。","昨天没有发生意外。\n也没有发生计划。","气温正常，风速正常，\n进度仍不明。"],
  sarcastic:["昨天没有下雨，\n但你还是没有出去。","紫外线很强，\n好在你没有接触到。","昨天日落很漂亮，\n你当时正在刷别人的生活。","准确率百分之百，\n因为一切都已经来不及了。"],
};
const toneLabels:Record<Tone,string> = { gentle:"温柔", dry:"冷淡", sarcastic:"讽刺" };
const activities = ["工作","学习","出门","休息","拖延","假装很忙"];

function Icon({ name, size=18 }:{ name:"arrow"|"refresh"|"search"|"close"|"share"|"check"; size?:number }) {
  const paths:Record<string,React.ReactNode> = {
    arrow:<><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>, refresh:<><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></>, search:<><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>, close:<><path d="m6 6 12 12M18 6 6 18"/></>, share:<><path d="M12 16V3m0 0L7 8m5-5 5 5"/><path d="M5 13v7h14v-7"/></>, check:<path d="m5 12 4 4 10-10"/>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
function formatDate(value:string) { const d=new Date(`${value}T12:00:00`); return `${d.getMonth()+1}月${d.getDate()}日`; }

export default function Home() {
  const [location,setLocation]=useState<Location>(TOKYO);
  const [days,setDays]=useState<WeatherDay[]>(fallbackDays);
  const [loading,setLoading]=useState(true);
  const [tone,setTone]=useState<Tone>("sarcastic");
  const [quoteIndex,setQuoteIndex]=useState(0);
  const [panel,setPanel]=useState<Panel>(null);
  const [cityOpen,setCityOpen]=useState(false);
  const [aboutOpen,setAboutOpen]=useState(false);
  const [search,setSearch]=useState("");
  const [results,setResults]=useState<Location[]>([]);
  const [searching,setSearching]=useState(false);
  const [erasing,setErasing]=useState(false);
  const [erased,setErased]=useState(false);
  const [saved,setSaved]=useState(false);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const [reflection,setReflection]=useState<Reflection>({ planned:6,completed:2,activity:"拖延",outside:false,rating:6,note:"本来想出门，后来躺下了。" });
  const day=days[0]??fallbackDays[0], previous=days[1]??fallbackDays[1];
  const quote=copy[tone][quoteIndex%copy[tone].length];
  const completion=reflection.planned?Math.round(reflection.completed/reflection.planned*100):0;

  useEffect(()=>{ queueMicrotask(()=>{ try { const l=localStorage.getItem("yci:selected-location"),t=localStorage.getItem("yci:commentary-tone") as Tone|null,r=localStorage.getItem("yci:reflection"); if(l)setLocation(JSON.parse(l)); if(t&&copy[t])setTone(t); if(r)setReflection(JSON.parse(r)); } catch {} }); },[]);
  useEffect(()=>{ let active=true; const p=new URLSearchParams({latitude:String(location.latitude),longitude:String(location.longitude),timezone:location.timezone,locationName:location.name,country:location.country}); fetch(`/api/weather?${p}`).then(r=>r.ok?r.json():Promise.reject()).then(data=>{if(active&&data.days?.length)setDays(data.days)}).catch(()=>{if(active)setDays(fallbackDays)}).finally(()=>{if(active)setLoading(false)}); return()=>{active=false}; },[location]);
  useEffect(()=>{ if(search.trim().length<2)return; const id=setTimeout(()=>{setSearching(true);fetch(`/api/geocoding?q=${encodeURIComponent(search.trim())}`).then(r=>r.json()).then(data=>setResults(data.results??[])).catch(()=>setResults([])).finally(()=>setSearching(false));},300); return()=>clearTimeout(id); },[search]);
  const verdict=useMemo(()=>{ if(day.precipitation===0&&!reflection.outside)return "昨天没有阻止你，床做到了。"; if(completion<40&&reflection.activity==="拖延")return "剩下的计划没有消失，只是搬去了未来。"; if(reflection.rating>=8&&completion>=80)return "天气只是背景，你才是昨天的主要内容。"; return "昨天已经结案，今天仍有申诉机会。"; },[day.precipitation,reflection,completion]);
  function updateTone(next:Tone){setTone(next);setQuoteIndex(v=>v+1);localStorage.setItem("yci:commentary-tone",next)}
  function selectLocation(next:Location){setLoading(true);setLocation(next);setCityOpen(false);setSearch("");setResults([]);localStorage.setItem("yci:selected-location",JSON.stringify(next))}
  function saveReflection(e:FormEvent){e.preventDefault();localStorage.setItem("yci:reflection",JSON.stringify(reflection));setSaved(true);setTimeout(()=>setSaved(false),1800)}
  function tilt(e:PointerEvent<HTMLElement>){if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;const el=e.currentTarget,r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;el.style.setProperty("--rx",`${(0.5-y)*5}deg`);el.style.setProperty("--ry",`${(x-0.5)*5}deg`);el.style.setProperty("--mx",`${x*100}%`);el.style.setProperty("--my",`${y*100}%`)}
  function startErase(){setErasing(true);timer.current=setTimeout(()=>{setErased(true);setErasing(false);setTimeout(()=>setErased(false),1500)},900)}
  function stopErase(){setErasing(false);if(timer.current)clearTimeout(timer.current)}

  return <main className="site-shell">
    <div className="ambient ambient-one"/><div className="ambient ambient-two"/>
    <header className="nav wrap"><button className="brand" onClick={()=>window.scrollTo({top:0,behavior:"smooth"})}>昨天本来可以<span>YESTERDAY, PERHAPS</span></button><nav><button className="location-button" onClick={()=>setCityOpen(true)}><span className="location-dot"/>{location.name}<Icon name="arrow" size={15}/></button><button className="text-button" onClick={()=>setAboutOpen(true)}>关于</button></nav></header>
    <section className="hero wrap"><div className="eyebrow"><span>YESTERDAY&apos;S WEATHER</span><i/></div>
      <article className={`weather-card ${erasing?"is-erasing":""}`} onPointerMove={tilt} onPointerLeave={e=>{e.currentTarget.style.setProperty("--rx","0deg");e.currentTarget.style.setProperty("--ry","0deg");stopErase()}} onPointerDown={startErase} onPointerUp={stopErase}>
        <div className="card-glow"/><div className={`weather-content ${loading?"is-loading":""}`}><div className="weather-topline"><span>{location.name} · {formatDate(day.date)}</span><span>已经发生</span></div><div className="temperature-row"><strong>{Math.round(day.temperatureMax)}<sup>°</sup></strong><div className="condition-mark"><span className="sun-ring"/><p>{day.condition}<small>{Math.round(day.temperatureMin)}° — {Math.round(day.temperatureMax)}°</small></p></div></div><blockquote className="quote" key={`${tone}-${quoteIndex}`}>{erased?<>擦不掉。<br/>服务器记得。</>:quote.split("\n").map((line,i)=><span key={i}>{line}</span>)}</blockquote><button className="again" onClick={e=>{e.stopPropagation();setQuoteIndex(v=>v+1)}}><Icon name="refresh"/>再说一句</button><div className="details"><div><span>降水</span><b>{day.precipitation} mm</b></div><div><span>日照</span><b>{day.sunshineDurationHours} h</b></div><div><span>风速</span><b>{day.windSpeedMax} km/h</b></div></div></div>
      </article>
      <div className="tone-row"><span>今天想怎么听</span><div className="segmented">{(Object.keys(toneLabels) as Tone[]).map(key=><button key={key} className={tone===key?"active":""} onClick={()=>updateTone(key)}>{toneLabels[key]}</button>)}</div></div><p className="press-hint">长按卡片，试着擦掉昨天</p>
    </section>
    <section className="actions wrap"><div className="section-intro"><span>02</span><div><h2>昨天留下的事</h2><p>不是为了改变过去，只是为了更准确地责怪自己。</p></div></div><div className="action-grid"><button className="action-card featured" onClick={()=>setPanel("reflection")}><span>YESTERDAY REVIEW</span><h3>复盘一下昨天</h3><p>六个小问题，给昨天留一份口供。</p><i><Icon name="arrow"/></i></button><button className="action-card" onClick={()=>setPanel("compare")}><span>DAY TO DAY</span><h3>和前天比一比</h3><p>看看问题到底是不是天气。</p><i><Icon name="arrow"/></i></button><button className="action-card" onClick={()=>setPanel("cities")}><span>ELSEWHERE</span><h3>看看别人的昨天</h3><p>距离提供不了答案，但可以提供参照。</p><i><Icon name="arrow"/></i></button><button className="action-card share-action" onClick={()=>setPanel("share")}><span>KEEP A COPY</span><h3>生成分享卡</h3><p>把已经来不及的事，保存得好看一点。</p><i><Icon name="share"/></i></button></div></section>
    <footer className="footer wrap"><p>天气已经发生，遗憾仍在更新。</p><span>数据来自 Open-Meteo · 复盘只留在这台设备</span></footer>
    {cityOpen&&<div className="overlay" onMouseDown={()=>setCityOpen(false)}><section className="dialog city-dialog" onMouseDown={e=>e.stopPropagation()}><button className="close" onClick={()=>setCityOpen(false)} aria-label="关闭"><Icon name="close"/></button><span className="dialog-kicker">CHANGE THE PAST LOCATION</span><h2>换一座城市的昨天</h2><label className="searchbox"><Icon name="search"/><input autoFocus value={search} onChange={e=>{setSearch(e.target.value);if(e.target.value.trim().length<2)setResults([])}} placeholder="输入城市名称"/></label><div className="results">{searching&&<p>正在回忆这座城市…</p>}{!searching&&results.map(item=><button key={item.id} onClick={()=>selectLocation(item)}><span><b>{item.name}</b><small>{item.admin1?`${item.admin1} · `:""}{item.country}</small></span><Icon name="arrow"/></button>)}{!searching&&search.length>=2&&results.length===0&&<p>这座城市暂时没有被找到。</p>}</div></section></div>}
    {aboutOpen&&<div className="overlay" onMouseDown={()=>setAboutOpen(false)}><section className="dialog about" onMouseDown={e=>e.stopPropagation()}><button className="close" onClick={()=>setAboutOpen(false)} aria-label="关闭"><Icon name="close"/></button><span className="dialog-kicker">ABOUT YESTERDAY</span><h2>这里只预报昨天。</h2><p>未来的天气网站很多，昨天只有一个。这里不负责提醒带伞，只负责在一切结束之后，给遗憾配上一句体面的说明。</p><div className="privacy-note">不要求登录，不上传复盘，不预测人生。</div></section></div>}
    {panel&&<div className="overlay panel-overlay" onMouseDown={()=>setPanel(null)}><section className="drawer" onMouseDown={e=>e.stopPropagation()}><button className="close" onClick={()=>setPanel(null)} aria-label="关闭"><Icon name="close"/></button>{panel==="reflection"&&<ReflectionPanel value={reflection} setValue={setReflection} completion={completion} verdict={verdict} save={saveReflection} saved={saved}/>} {panel==="compare"&&<ComparePanel day={day} previous={previous} location={location}/>} {panel==="cities"&&<CitiesPanel location={location} day={day}/>} {panel==="share"&&<SharePanel location={location} day={day} quote={quote} verdict={verdict}/>}</section></div>}
  </main>;
}

function ReflectionPanel({value,setValue,completion,verdict,save,saved}:{value:Reflection;setValue:(v:Reflection)=>void;completion:number;verdict:string;save:(e:FormEvent)=>void;saved:boolean}) { return <><span className="dialog-kicker">YESTERDAY REVIEW</span><h2>复盘一下昨天</h2><p className="drawer-lead">不是为了改变过去，只是为了更准确地责怪自己。</p><form className="reflection-form" onSubmit={save}><div className="two-fields"><label>原本计划做几件事？<input type="number" min="0" max="20" value={value.planned} onChange={e=>setValue({...value,planned:Number(e.target.value),completed:Math.min(value.completed,Number(e.target.value))})}/></label><label>最后完成了几件？<input type="number" min="0" max={value.planned} value={value.completed} onChange={e=>setValue({...value,completed:Number(e.target.value)})}/></label></div><fieldset><legend>主要状态</legend><div className="choice-grid">{activities.map(a=><button type="button" className={value.activity===a?"selected":""} key={a} onClick={()=>setValue({...value,activity:a})}>{a}</button>)}</div></fieldset><fieldset><legend>昨天出门了吗？</legend><div className="binary"><button type="button" className={value.outside?"selected":""} onClick={()=>setValue({...value,outside:true})}>出门了</button><button type="button" className={!value.outside?"selected":""} onClick={()=>setValue({...value,outside:false})}>没有出门</button></div></fieldset><label>给昨天打几分？ <b>{value.rating} / 10</b><input className="range" type="range" min="1" max="10" value={value.rating} onChange={e=>setValue({...value,rating:Number(e.target.value)})}/></label><label>一句话复盘<textarea maxLength={50} value={value.note} onChange={e=>setValue({...value,note:e.target.value})}/></label><div className="verdict"><span>昨日判词 · 完成率 {completion}%</span><p>{verdict}</p></div><button className="primary" type="submit">{saved?<><Icon name="check"/> 已保存在这台设备</>:"保存昨天的口供"}</button></form></>; }
function ComparePanel({day,previous,location}:{day:WeatherDay;previous:WeatherDay;location:Location}) { return <><span className="dialog-kicker">DAY TO DAY</span><h2>和前天比一比</h2><p className="drawer-lead">连续两天天气不同。你连续两天做了相同的事。</p><div className="compare-grid"><MiniWeather title="昨天" day={day} location={location.name}/><MiniWeather title="前天" day={previous} location={location.name}/></div><div className="comparison-note"><span>结论</span><p>{day.precipitation<previous.precipitation?"天气已经明显改善。你的生活方式保持稳定。":"天气没有变得更好，但至少已经过去了。"}</p></div></>; }
function CitiesPanel({location,day}:{location:Location;day:WeatherDay}) {
  const [otherLocation,setOtherLocation]=useState<Location>({id:"shanghai-cn",name:"上海",country:"中国",latitude:31.23,longitude:121.47,timezone:"Asia/Shanghai"});
  const [other,setOther]=useState<WeatherDay>({...fallbackDays[1],condition:"晴",temperatureMax:31,temperatureMin:24,precipitation:0});
  const [query,setQuery]=useState(""),[choices,setChoices]=useState<Location[]>([]),[busy,setBusy]=useState(false);
  useEffect(()=>{const p=new URLSearchParams({latitude:String(otherLocation.latitude),longitude:String(otherLocation.longitude),timezone:otherLocation.timezone,locationName:otherLocation.name,country:otherLocation.country});fetch(`/api/weather?${p}`).then(r=>r.json()).then(data=>{if(data.days?.[0])setOther(data.days[0])}).catch(()=>{});},[otherLocation]);
  function findCity(){if(query.trim().length<2)return;setBusy(true);fetch(`/api/geocoding?q=${encodeURIComponent(query.trim())}`).then(r=>r.json()).then(data=>setChoices(data.results??[])).finally(()=>setBusy(false));}
  return <><span className="dialog-kicker">ELSEWHERE, YESTERDAY</span><h2>看看别人的昨天</h2><p className="drawer-lead">相隔一千公里，大家都各自错过了一些东西。</p><div className="compare-grid"><MiniWeather title="这里" day={day} location={location.name}/><MiniWeather title="别处" day={other} location={otherLocation.name}/></div><div className="inline-city-search"><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")findCity()}} placeholder="换一座城市"/><button onClick={findCity}>{busy?"寻找中":"查找"}</button></div>{choices.length>0&&<div className="compact-results">{choices.slice(0,4).map(item=><button key={item.id} onClick={()=>{setOtherLocation(item);setChoices([]);setQuery("")}}>{item.name}<span>{item.country}</span></button>)}</div>}<div className="comparison-note"><span>结论</span><p>{other.temperatureMax>day.temperatureMax?"另一个城市天气更好。这不会改变什么，但现在你知道了。":"换了一座城市，遗憾依旧拥有相似的气候。"}</p></div></>;
}
function MiniWeather({title,day,location}:{title:string;day:WeatherDay;location:string}) { return <article className="mini-weather"><span>{title} · {formatDate(day.date)}</span><h3>{location}</h3><strong>{Math.round(day.temperatureMax)}°</strong><p>{day.condition}</p><dl><div><dt>最低</dt><dd>{Math.round(day.temperatureMin)}°</dd></div><div><dt>降水</dt><dd>{day.precipitation} mm</dd></div><div><dt>日照</dt><dd>{day.sunshineDurationHours} h</dd></div></dl></article>; }
function SharePanel({location,day,quote,verdict}:{location:Location;day:WeatherDay;quote:string;verdict:string}) {
  const [square,setSquare]=useState(false);
  function download(){const w=1080,h=square?1080:1920,canvas=document.createElement("canvas"),ctx=canvas.getContext("2d");if(!ctx)return;canvas.width=w;canvas.height=h;const g=ctx.createLinearGradient(0,0,w,h);g.addColorStop(0,"#f5efe3");g.addColorStop(1,"#dccaa8");ctx.fillStyle=g;ctx.fillRect(0,0,w,h);ctx.fillStyle="#2e2a24";ctx.font="42px serif";ctx.fillText("昨天本来可以",90,120);ctx.font="28px sans-serif";ctx.fillStyle="#776d5f";ctx.fillText(`${location.name} · ${day.date.replaceAll("-",".")}`,90,square?290:520);ctx.fillStyle="#2e2a24";ctx.font="240px sans-serif";ctx.fillText(`${Math.round(day.temperatureMax)}°`,75,square?530:810);ctx.font="58px serif";quote.split("\n").forEach((line,i)=>ctx.fillText(line,90,(square?680:1000)+i*92));ctx.font="34px serif";ctx.fillText("天气已经发生，遗憾仍在更新。",90,h-150);ctx.font="24px serif";ctx.fillStyle="#776d5f";ctx.fillText(verdict,90,h-92);const link=document.createElement("a");link.download=`昨天本来可以-${day.date}.png`;link.href=canvas.toDataURL("image/png",1);link.click()}
  return <><span className="dialog-kicker">KEEP A COPY</span><h2>保存一个已经结束的日子</h2><div className="format-switch"><button className={!square?"active":""} onClick={()=>setSquare(false)}>9:16 竖版</button><button className={square?"active":""} onClick={()=>setSquare(true)}>1:1 方形</button></div><div className={`share-card ${square?"square":""}`}><span>昨天本来可以</span><div><small>{location.name} · {day.date.replaceAll("-",".")}</small><strong>{Math.round(day.temperatureMax)}°</strong><p>{quote}</p></div><footer>天气已经发生<br/>遗憾仍在更新。<i>{verdict}</i></footer></div><button className="primary" onClick={download}><Icon name="share"/>生成高清图片</button></>;
}

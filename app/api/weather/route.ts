import { NextRequest, NextResponse } from "next/server";

function condition(code:number,max:number){if(max>=33)return"高温";if(code===0)return"晴";if(code<=2)return"晴间多云";if(code===3)return"多云";if(code<=48)return"有雾";if(code<=57)return"细雨";if(code<=67)return"雨";if(code<=77)return"雪";if(code<=82)return"阵雨";if(code<=86)return"阵雪";return"雷雨"}
export async function GET(request:NextRequest){
  const p=request.nextUrl.searchParams,latitude=Number(p.get("latitude")),longitude=Number(p.get("longitude")),timezone=p.get("timezone")||"auto";
  if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)return NextResponse.json({error:{code:"INVALID_ARGUMENT",message:"城市坐标不正确",retryable:false}},{status:400});
  try{
    const url=new URL("https://archive-api.open-meteo.com/v1/archive"),now=new Date(),end=new Date(now),start=new Date(now);end.setUTCDate(end.getUTCDate()-1);start.setUTCDate(start.getUTCDate()-2);const iso=(d:Date)=>d.toISOString().slice(0,10);
    url.search=new URLSearchParams({latitude:String(latitude),longitude:String(longitude),timezone,start_date:iso(start),end_date:iso(end),daily:"weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_sum,sunshine_duration,wind_speed_10m_max"}).toString();
    const response=await fetch(url,{headers:{accept:"application/json"}});if(!response.ok)throw new Error("provider");const raw=await response.json() as {daily:Record<string,(number|string)[]>},d=raw.daily;
    const days=d.time.map((date,i)=>({date,weatherCode:d.weather_code[i],condition:condition(Number(d.weather_code[i]),Number(d.temperature_2m_max[i])),temperatureMax:d.temperature_2m_max[i],temperatureMin:d.temperature_2m_min[i],apparentTemperatureMax:d.apparent_temperature_max[i],precipitation:d.precipitation_sum[i],sunshineDurationHours:Math.round(Number(d.sunshine_duration[i])/360)/10,windSpeedMax:d.wind_speed_10m_max[i]})).reverse();
    return NextResponse.json({location:{name:p.get("locationName"),country:p.get("country"),timezone,latitude,longitude},days,fetchedAt:new Date().toISOString()},{headers:{"Cache-Control":"public, max-age=600, s-maxage=14400"}});
  }catch{return NextResponse.json({error:{code:"WEATHER_PROVIDER_ERROR",message:"昨天的天气暂时想不起来",retryable:true}},{status:502})}
}

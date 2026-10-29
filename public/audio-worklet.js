// Average hardware-rate samples into 16 kHz bins while capturing. Only bounded,
// small PCM batches cross to the page; do not retain 44.1/48 kHz recordings.
class Capture extends AudioWorkletProcessor {
  constructor(){
    super();this.output=new Float32Array(2048);this.length=0;this.phase=0;this.sum=0;this.count=0;this.total=0;
    this.port.onmessage=({data})=>{if(data==='flush'){
      if(this.count){this.emitSample(this.sum/this.count);this.sum=0;this.count=0;this.phase=0}
      this.flush();this.port.postMessage({flushed:true});
    }};
  }
  emitSample(value){
    if(this.total>=16000*30)return;
    this.output[this.length++]=value;this.total++;
    if(this.length===this.output.length)this.flush();
  }
  flush(){
    if(!this.length)return;
    const result=this.output.slice(0,this.length);
    this.port.postMessage(result,[result.buffer]);this.length=0;
  }
  process(inputs){
    const audio=inputs[0]?.[0];
    if(audio&&this.total<16000*30)for(const value of audio){
      this.sum+=value;this.count++;this.phase+=16000;
      if(this.phase>=sampleRate){this.phase-=sampleRate;this.emitSample(this.sum/this.count);this.sum=0;this.count=0}
    }
    return true;
  }
}
registerProcessor('capture',Capture);

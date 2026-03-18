import{L as P,C as f,E as O,g as I,d as D,a as N,b as A,i as F,v as R,F as x}from"./firebase-DI-MPdY7.js";import{o as M}from"./vendor-Bg_btqvK.js";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class T{constructor(e){this.container=e}getPlatformInfoString(){return this.container.getProviders().map(t=>{if(k(t)){const r=t.getImmediate();return`${r.library}/${r.version}`}else return null}).filter(t=>t).join(" ")}}function k(a){const e=a.getComponent();return(e==null?void 0:e.type)==="VERSION"}const m="@firebase/app",E="0.13.2";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const o=new P("@firebase/app"),U="@firebase/app-compat",j="@firebase/analytics-compat",L="@firebase/analytics",V="@firebase/app-check-compat",G="@firebase/app-check",z="@firebase/auth",J="@firebase/auth-compat",Y="@firebase/database",q="@firebase/data-connect",X="@firebase/database-compat",K="@firebase/functions",W="@firebase/functions-compat",Q="@firebase/installations",Z="@firebase/installations-compat",ee="@firebase/messaging",te="@firebase/messaging-compat",ae="@firebase/performance",re="@firebase/performance-compat",ne="@firebase/remote-config",se="@firebase/remote-config-compat",ie="@firebase/storage",oe="@firebase/storage-compat",ce="@firebase/firestore",le="@firebase/ai",de="@firebase/firestore-compat",pe="firebase",he="11.10.0";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const g="[DEFAULT]",fe={[m]:"fire-core",[U]:"fire-core-compat",[L]:"fire-analytics",[j]:"fire-analytics-compat",[G]:"fire-app-check",[V]:"fire-app-check-compat",[z]:"fire-auth",[J]:"fire-auth-compat",[Y]:"fire-rtdb",[q]:"fire-data-connect",[X]:"fire-rtdb-compat",[K]:"fire-fn",[W]:"fire-fn-compat",[Q]:"fire-iid",[Z]:"fire-iid-compat",[ee]:"fire-fcm",[te]:"fire-fcm-compat",[ae]:"fire-perf",[re]:"fire-perf-compat",[ne]:"fire-rc",[se]:"fire-rc-compat",[ie]:"fire-gcs",[oe]:"fire-gcs-compat",[ce]:"fire-fst",[de]:"fire-fst-compat",[le]:"fire-vertex","fire-js":"fire-js",[pe]:"fire-js-all"};/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const d=new Map,u=new Map,v=new Map;function $(a,e){try{a.container.addComponent(e)}catch(t){o.debug(`Component ${e.name} failed to register with FirebaseApp ${a.name}`,t)}}function _(a){const e=a.name;if(v.has(e))return o.debug(`There were multiple attempts to register component ${e}.`),!1;v.set(e,a);for(const t of d.values())$(t,a);for(const t of u.values())$(t,a);return!0}function Be(a,e){const t=a.container.getProvider("heartbeat").getImmediate({optional:!0});return t&&t.triggerHeartbeat(),a.container.getProvider(e)}function Pe(a){return a==null?!1:a.settings!==void 0}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const be={"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different options or config","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."},c=new O("app","Firebase",be);/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class me{constructor(e,t,r){this._isDeleted=!1,this._options=Object.assign({},e),this._config=Object.assign({},t),this._name=t.name,this._automaticDataCollectionEnabled=t.automaticDataCollectionEnabled,this._container=r,this.container.addComponent(new f("app",()=>this,"PUBLIC"))}get automaticDataCollectionEnabled(){return this.checkDestroyed(),this._automaticDataCollectionEnabled}set automaticDataCollectionEnabled(e){this.checkDestroyed(),this._automaticDataCollectionEnabled=e}get name(){return this.checkDestroyed(),this._name}get options(){return this.checkDestroyed(),this._options}get config(){return this.checkDestroyed(),this._config}get container(){return this._container}get isDeleted(){return this._isDeleted}set isDeleted(e){this._isDeleted=e}checkDestroyed(){if(this.isDeleted)throw c.create("app-deleted",{appName:this._name})}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Oe=he;function ge(a,e={}){let t=a;typeof e!="object"&&(e={name:e});const r=Object.assign({name:g,automaticDataCollectionEnabled:!0},e),n=r.name;if(typeof n!="string"||!n)throw c.create("bad-app-name",{appName:String(n)});if(t||(t=I()),!t)throw c.create("no-options");const s=d.get(n);if(s){if(D(t,s.options)&&D(r,s.config))return s;throw c.create("duplicate-app",{appName:n})}const i=new N(n);for(const w of v.values())i.addComponent(w);const l=new me(t,r,i);return d.set(n,l),l}function Ne(a=g){const e=d.get(a);if(!e&&a===g&&I())return ge();if(!e)throw c.create("no-app",{appName:a});return e}async function Fe(a){let e=!1;const t=a.name;d.has(t)?(e=!0,d.delete(t)):u.has(t)&&a.decRefCount()<=0&&(u.delete(t),e=!0),e&&(await Promise.all(a.container.getProviders().map(r=>r.delete())),a.isDeleted=!0)}function h(a,e,t){var r;let n=(r=fe[a])!==null&&r!==void 0?r:a;t&&(n+=`-${t}`);const s=n.match(/\s|\//),i=e.match(/\s|\//);if(s||i){const l=[`Unable to register library "${n}" with version "${e}":`];s&&l.push(`library name "${n}" contains illegal characters (whitespace or "/")`),s&&i&&l.push("and"),i&&l.push(`version name "${e}" contains illegal characters (whitespace or "/")`),o.warn(l.join(" "));return}_(new f(`${n}-version`,()=>({library:n,version:e}),"VERSION"))}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ue="firebase-heartbeat-database",ve=1,p="firebase-heartbeat-store";let b=null;function H(){return b||(b=M(ue,ve,{upgrade:(a,e)=>{switch(e){case 0:try{a.createObjectStore(p)}catch(t){console.warn(t)}}}}).catch(a=>{throw c.create("idb-open",{originalErrorMessage:a.message})})),b}async function _e(a){try{const t=(await H()).transaction(p),r=await t.objectStore(p).get(B(a));return await t.done,r}catch(e){if(e instanceof x)o.warn(e.message);else{const t=c.create("idb-get",{originalErrorMessage:e==null?void 0:e.message});o.warn(t.message)}}}async function C(a,e){try{const r=(await H()).transaction(p,"readwrite");await r.objectStore(p).put(e,B(a)),await r.done}catch(t){if(t instanceof x)o.warn(t.message);else{const r=c.create("idb-set",{originalErrorMessage:t==null?void 0:t.message});o.warn(r.message)}}}function B(a){return`${a.name}!${a.options.appId}`}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const we=1024,De=30;class Ee{constructor(e){this.container=e,this._heartbeatsCache=null;const t=this.container.getProvider("app").getImmediate();this._storage=new Ce(t),this._heartbeatsCachePromise=this._storage.read().then(r=>(this._heartbeatsCache=r,r))}async triggerHeartbeat(){var e,t;try{const n=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),s=S();if(((e=this._heartbeatsCache)===null||e===void 0?void 0:e.heartbeats)==null&&(this._heartbeatsCache=await this._heartbeatsCachePromise,((t=this._heartbeatsCache)===null||t===void 0?void 0:t.heartbeats)==null)||this._heartbeatsCache.lastSentHeartbeatDate===s||this._heartbeatsCache.heartbeats.some(i=>i.date===s))return;if(this._heartbeatsCache.heartbeats.push({date:s,agent:n}),this._heartbeatsCache.heartbeats.length>De){const i=Se(this._heartbeatsCache.heartbeats);this._heartbeatsCache.heartbeats.splice(i,1)}return this._storage.overwrite(this._heartbeatsCache)}catch(r){o.warn(r)}}async getHeartbeatsHeader(){var e;try{if(this._heartbeatsCache===null&&await this._heartbeatsCachePromise,((e=this._heartbeatsCache)===null||e===void 0?void 0:e.heartbeats)==null||this._heartbeatsCache.heartbeats.length===0)return"";const t=S(),{heartbeatsToSend:r,unsentEntries:n}=$e(this._heartbeatsCache.heartbeats),s=A(JSON.stringify({version:2,heartbeats:r}));return this._heartbeatsCache.lastSentHeartbeatDate=t,n.length>0?(this._heartbeatsCache.heartbeats=n,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),s}catch(t){return o.warn(t),""}}}function S(){return new Date().toISOString().substring(0,10)}function $e(a,e=we){const t=[];let r=a.slice();for(const n of a){const s=t.find(i=>i.agent===n.agent);if(s){if(s.dates.push(n.date),y(t)>e){s.dates.pop();break}}else if(t.push({agent:n.agent,dates:[n.date]}),y(t)>e){t.pop();break}r=r.slice(1)}return{heartbeatsToSend:t,unsentEntries:r}}class Ce{constructor(e){this.app=e,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck()}async runIndexedDBEnvironmentCheck(){return F()?R().then(()=>!0).catch(()=>!1):!1}async read(){if(await this._canUseIndexedDBPromise){const t=await _e(this.app);return t!=null&&t.heartbeats?t:{heartbeats:[]}}else return{heartbeats:[]}}async overwrite(e){var t;if(await this._canUseIndexedDBPromise){const n=await this.read();return C(this.app,{lastSentHeartbeatDate:(t=e.lastSentHeartbeatDate)!==null&&t!==void 0?t:n.lastSentHeartbeatDate,heartbeats:e.heartbeats})}else return}async add(e){var t;if(await this._canUseIndexedDBPromise){const n=await this.read();return C(this.app,{lastSentHeartbeatDate:(t=e.lastSentHeartbeatDate)!==null&&t!==void 0?t:n.lastSentHeartbeatDate,heartbeats:[...n.heartbeats,...e.heartbeats]})}else return}}function y(a){return A(JSON.stringify({version:2,heartbeats:a})).length}function Se(a){if(a.length===0)return-1;let e=0,t=a[0].date;for(let r=1;r<a.length;r++)a[r].date<t&&(t=a[r].date,e=r);return e}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ye(a){_(new f("platform-logger",e=>new T(e),"PRIVATE")),_(new f("heartbeat",e=>new Ee(e),"PRIVATE")),h(m,E,a),h(m,E,"esm2017"),h("fire-js","")}ye("");var Ie="firebase",Ae="11.10.0";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */h(Ie,Ae,"app");export{Oe as S,_,Pe as a,Be as b,Fe as d,Ne as g,ge as i,h as r};

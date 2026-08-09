const b=document.getElementById('menuBtn');
const m=document.getElementById('menu');

b?.addEventListener('click',()=>{
  const isOpen=m.classList.toggle('open');
  b.textContent=isOpen?'✕':'☰';
  b.setAttribute('aria-expanded',String(isOpen));
});

m?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
  m.classList.remove('open');
  b.textContent='☰';
  b.setAttribute('aria-expanded','false');
}));

document.getElementById('year').textContent=new Date().getFullYear();

document.getElementById('form')?.addEventListener('submit',e=>{
  e.preventDefault();
  const name=document.getElementById('name').value.trim();
  const phone=document.getElementById('phone').value.trim();
  const branch=document.getElementById('branch');
  const number=branch.value;
  const branchName=branch.options[branch.selectedIndex].text;
  const pet=document.getElementById('pet').value.trim();
  const msg=document.getElementById('message').value.trim();

  if(!name||!phone||!msg){
    alert('Completá nombre, teléfono y mensaje.');
    return;
  }

  const text=[
    `Hola Terranova, quisiera hacer una consulta con la sucursal ${branchName}.`,
    '',
    `Nombre: ${name}`,
    `Teléfono: ${phone}`,
    pet?`Mascota: ${pet}`:null,
    `Mensaje: ${msg}`
  ].filter(Boolean).join('\n');

  window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`,'_blank','noopener,noreferrer');
});

const catalogGrid=document.getElementById('catalogGrid');
const catalogCount=document.getElementById('catalogCount');
const catalogEmpty=document.getElementById('catalogEmpty');
const catalogError=document.getElementById('catalogError');
const productSearch=document.getElementById('productSearch');
const speciesFilter=document.getElementById('speciesFilter');
const brandFilter=document.getElementById('brandFilter');
const clearFilters=document.getElementById('clearFilters');
let catalogProducts=[];

const normalize=value=>(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const formatPrice=value=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:2}).format(value);

function createProductCard(product){
  const card=document.createElement('article');
  card.className='product-card';
  const media=document.createElement('div');
  media.className='product-media';

  if(product.image){
    const img=document.createElement('img');
    img.src=product.image;
    img.alt=`${product.brand} ${product.line} ${product.name}`;
    img.loading='lazy';
    media.append(img);
  }else{
    const placeholder=document.createElement('div');
    placeholder.className='product-placeholder';
    const brand=document.createElement('span');
    brand.textContent=product.brand;
    const name=document.createElement('b');
    name.textContent=product.name;
    placeholder.append(brand,name);
    media.append(placeholder);
  }

  const body=document.createElement('div');
  body.className='product-body';
  const eyebrow=document.createElement('p');
  eyebrow.className='product-eyebrow';
  eyebrow.textContent=`${product.brand} · ${product.line}`;
  const title=document.createElement('h3');
  title.textContent=product.name;
  body.append(eyebrow,title);

  const details=document.createElement('div');
  details.className='product-details';
  [product.species,product.lifeStage].filter(Boolean).forEach(value=>{
    const detail=document.createElement('span');
    detail.className='product-detail';
    detail.textContent=value;
    details.append(detail);
  });
  body.append(details);

  if(product.price&&product.presentations.length){
    const offers=document.createElement('div');
    offers.className='product-offers';
    product.presentations.forEach(presentation=>{
      const offer=document.createElement('div');
      offer.className='product-offer';
      const size=document.createElement('span');
      size.textContent=presentation;
      const price=document.createElement('b');
      const value=product.price[presentation];
      price.textContent=typeof value==='number'?formatPrice(value):'Consultar';
      offer.append(size,price);
      offers.append(offer);
    });
    body.append(offers);
  }else{
    const query=document.createElement('p');
    query.className='product-price-query';
    query.textContent='Consultar precio';
    body.append(query);
  }

  const button=document.createElement('button');
  button.className='btn product-whatsapp';
  button.type='button';
  button.textContent='Consultar por WhatsApp';
  button.addEventListener('click',()=>{
    const presentationText=product.presentations.length?` Presentaciones: ${product.presentations.join(', ')}.`:'';
    document.getElementById('message').value=`Quisiera consultar por ${product.brand} ${product.line} ${product.name}.${presentationText}`;
    document.getElementById('contacto').scrollIntoView({behavior:'smooth'});
    window.setTimeout(()=>document.getElementById('name').focus(),450);
  });
  body.append(button);
  card.append(media,body);
  return card;
}

function renderCatalog(){
  const search=normalize(productSearch.value.trim());
  const species=speciesFilter.value;
  const brand=brandFilter.value;
  const filtered=catalogProducts.filter(product=>{
    const matchesName=!search||normalize(product.name).includes(search);
    return matchesName&&(!species||product.species===species)&&(!brand||product.brand===brand);
  });

  catalogGrid.replaceChildren(...filtered.map(createProductCard));
  catalogCount.textContent=`${filtered.length} ${filtered.length===1?'producto':'productos'}`;
  catalogEmpty.hidden=filtered.length!==0;
  clearFilters.hidden=!search&&!species&&!brand;
}

async function loadCatalog(){
  if(!catalogGrid)return;
  const loading=document.createElement('div');
  loading.className='catalog-loading';
  loading.textContent='Cargando catálogo…';
  catalogGrid.append(loading);
  try{
    const response=await fetch('data/products.json');
    if(!response.ok)throw new Error(`No se pudo cargar el catálogo (${response.status})`);
    const data=await response.json();
    catalogProducts=Array.isArray(data.products)?data.products:[];
    [...new Set(catalogProducts.map(product=>product.brand))].sort((a,z)=>a.localeCompare(z,'es')).forEach(brand=>{
      const option=document.createElement('option');
      option.value=brand;
      option.textContent=brand;
      brandFilter.append(option);
    });
    renderCatalog();
  }catch(error){
    console.error('Error al cargar products.json:',error);
    catalogGrid.replaceChildren();
    catalogCount.textContent='Catálogo no disponible';
    catalogError.hidden=false;
  }finally{
    catalogGrid.setAttribute('aria-busy','false');
  }
}

[productSearch,speciesFilter,brandFilter].forEach(control=>control?.addEventListener(control===productSearch?'input':'change',renderCatalog));

clearFilters?.addEventListener('click',()=>{
  productSearch.value='';
  speciesFilter.value='';
  brandFilter.value='';
  renderCatalog();
  productSearch.focus();
});

loadCatalog();

const revealItems=document.querySelectorAll('.reveal');
if('IntersectionObserver' in window){
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  },{threshold:.12});
  revealItems.forEach(item=>observer.observe(item));
}else{
  revealItems.forEach(item=>item.classList.add('visible'));
}

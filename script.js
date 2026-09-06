const menuButton=document.getElementById('menuBtn');
const menu=document.getElementById('menu');

menuButton?.addEventListener('click',()=>{
  const isOpen=menu.classList.toggle('open');
  menuButton.classList.toggle('is-open',isOpen);
  menuButton.setAttribute('aria-label',isOpen?'Cerrar menú':'Abrir menú');
  menuButton.setAttribute('aria-expanded',String(isOpen));
});

menu?.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{
  menu.classList.remove('open');
  menuButton.classList.remove('is-open');
  menuButton.setAttribute('aria-label','Abrir menú');
  menuButton.setAttribute('aria-expanded','false');
}));

document.getElementById('year').textContent=new Date().getFullYear();

document.getElementById('form')?.addEventListener('submit',event=>{
  event.preventDefault();
  const name=document.getElementById('name').value.trim();
  const phone=document.getElementById('phone').value.trim();
  const branch=document.getElementById('branch');
  const pet=document.getElementById('pet').value.trim();
  const message=document.getElementById('message').value.trim();

  if(!name||!phone||!message){
    alert('Completá nombre, teléfono y mensaje.');
    return;
  }

  const text=[
    `Hola Terranova, quisiera hacer una consulta con la sucursal ${branch.options[branch.selectedIndex].text}.`,
    '',
    `Nombre: ${name}`,
    `Teléfono: ${phone}`,
    pet?`Mascota: ${pet}`:null,
    `Mensaje: ${message}`
  ].filter(Boolean).join('\n');
  window.open(`https://wa.me/${branch.value}?text=${encodeURIComponent(text)}`,'_blank','noopener,noreferrer');
});

const catalog={
  grid:document.getElementById('catalogGrid'),
  count:document.getElementById('catalogCount'),
  empty:document.getElementById('catalogEmpty'),
  error:document.getElementById('catalogError'),
  retry:document.getElementById('retryCatalog'),
  search:document.getElementById('productSearch'),
  category:document.getElementById('categoryFilter'),
  brand:document.getElementById('brandFilter'),
  species:document.getElementById('speciesFilter'),
  sort:document.getElementById('sortFilter'),
  chips:document.getElementById('activeFilterChips'),
  clear:document.getElementById('clearFilters'),
  products:[],
  request:null
};

const storeSection=document.getElementById('tienda');
const openCatalogButton=document.getElementById('openCatalog');
function openFullCatalog(){
  storeSection?.classList.add('is-catalog-expanded');
}
openCatalogButton?.addEventListener('click',()=>{
  openFullCatalog();
  document.getElementById('productSearch')?.focus({preventScroll:true});
});
document.querySelectorAll('[data-open-catalog]').forEach(link=>link.addEventListener('click',openFullCatalog));

const categoryLabels={
  'accesorios':'Accesorios',
  'alimentacion-e-hidratacion':'Alimentación e hidratación',
  'alimentos':'Alimentos',
  'alimentos-y-snacks':'Alimentos y snacks',
  'camas-y-descanso':'Camas y descanso',
  'juguetes':'Juguetes',
  'paseo':'Paseo'
};
const speciesLabels={perro:'Perros',gato:'Gatos'};
const lifeStageLabels={cachorro:'cachorros',gatito:'gatitos',adulto:'adultos',senior:'adultos senior'};
const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').trim();
const asArray=value=>Array.isArray(value)?value:value?[value]:[];
const uniqueSorted=values=>[...new Set(values.filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
const formatPrice=(amount,currency='ARS')=>new Intl.NumberFormat('es-AR',{style:'currency',currency,maximumFractionDigits:2}).format(amount);
const humanize=value=>String(value||'').replaceAll('-',' ').replace(/\b\p{L}/gu,letter=>letter.toLocaleUpperCase('es'));

const KEEP_UPPERCASE=new Set(['xs','s','m','l','xl','xxl','xs/s','s/m','m/l','l/xl','ean','can cat','mkr','trixie']);
function tidyLabel(value){
  const text=String(value||'').trim();
  if(!text)return text;
  return text.split(' ').map(word=>{
    const bare=word.replace(/["“”]/g,'');
    const hasLetters=/[a-zA-ZÀ-ÿ]/.test(bare);
    const isShouting=hasLetters&&bare===bare.toUpperCase()&&bare!==bare.toLowerCase();
    if(!isShouting)return word;
    if(KEEP_UPPERCASE.has(bare.toLowerCase()))return word;
    if(/^[a-zA-ZÀ-ÿ]{1,3}([/-][a-zA-ZÀ-ÿ]{1,3})*$/.test(bare))return word;
    return word.charAt(0)+word.slice(1).toLocaleLowerCase('es');
  }).join(' ');
}

function displayName(product){
  const name=tidyLabel(product?.name);
  const brand=String(product?.brand||'').trim();
  if(!brand)return name;
  const escaped=brand.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const stripped=name.replace(new RegExp(`(^|\\s)${escaped}(?=\\s|$)`,'gi'),'$1').replace(/\s{2,}/g,' ').trim();
  return stripped||name;
}

function cheapestVariant(variants){
  let best=variants[0]||null;
  let bestAmount=Number.isFinite(best?.retailPrice?.amount)?best.retailPrice.amount:Infinity;
  variants.forEach(variant=>{
    const amount=variant?.retailPrice?.amount;
    if(Number.isFinite(amount)&&amount<bestAmount){best=variant;bestAmount=amount;}
  });
  return best;
}

function variantLabel(variant){
  const fields=[variant?.presentation,variant?.size,variant?.dimensions,variant?.color,variant?.pattern];
  const label=[...new Set(fields.filter(Boolean))].map(tidyLabel).join(' · ');
  return label||variant?.sku||'Variante disponible';
}

function searchableText(product){
  const variants=asArray(product.variants);
  return normalize([
    product.name,product.brand,product.line,product.category,categoryLabels[product.category],product.subcategory,
    product.flavor,product.need,product.lifeStage,product.description,...asArray(product.features),...asArray(product.species),
    ...variants.flatMap(variant=>[variant.presentation,variant.size,variant.dimensions,variant.color,variant.pattern,variant.sku])
  ].filter(Boolean).join(' '));
}

function setFilterOptions(select,values,labelFor){
  while(select.options.length>1)select.remove(1);
  values.forEach(value=>select.add(new Option(labelFor(value),value)));
  select.disabled=false;
}

function createChip(value){
  const chip=document.createElement('span');
  chip.className='product-detail';
  chip.textContent=value;
  return chip;
}

function productDescription(product){
  if(product.description)return product.description;
  const species=asArray(product.species).map(value=>speciesLabels[value]||humanize(value).toLocaleLowerCase('es'));
  const extras=[
    species.length?`para ${species.join(' y ').toLocaleLowerCase('es')}`:null,
    product.lifeStage?`etapa ${lifeStageLabels[product.lifeStage]||product.lifeStage}`:null,
    product.need?`orientado a ${product.need}`:null,
    product.flavor?`sabor ${product.flavor}`:null
  ].filter(Boolean);
  if(!extras.length)return null;
  const intro=`${categoryLabels[product.category]||humanize(product.category)} de ${product.brand}${product.line?`, línea ${product.line}`:''}`;
  return `${[intro,...extras].join(', ')}.`;
}

function productImagePath(product,variant){
  return product.mainImage||product.image||variant?.image||null;
}

function buildPlaceholder(caption){
  const placeholder=document.createElement('div');
  placeholder.className='product-placeholder';
  const mark=document.createElement('span');
  mark.className='placeholder-mark';
  mark.innerHTML='<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="m5 17 4-4 3 3 4-5 3 4"/></svg>';
  const captionEl=document.createElement('span');
  captionEl.className='placeholder-brand';
  captionEl.textContent=caption;
  placeholder.append(mark,captionEl);
  return placeholder;
}

function createProductCard(product){
  const variants=asArray(product.variants);
  let selectedVariant=cheapestVariant(variants);
  const card=document.createElement('article');
  card.className='product-card';
  card.dataset.productId=product.id;

  const media=document.createElement('div');
  media.className='product-media';
  if(normalize(product.brand)==='purina'&&normalize(product.line)==='excellent'){
    media.classList.add('product-media--excellent');
  }
  const imagePath=productImagePath(product,selectedVariant);
  if(imagePath){
    const image=document.createElement('img');
    image.src=imagePath;
    image.alt=`${product.brand} ${displayName(product)}`;
    image.loading='lazy';
    image.decoding='async';
    image.addEventListener('load',()=>media.classList.add('is-loaded'),{once:true});
    media.append(image);
  }else{
    media.append(buildPlaceholder('Foto próximamente'));
  }

  const body=document.createElement('div');
  body.className='product-body';
  const eyebrow=document.createElement('p');
  eyebrow.className='product-eyebrow';
  if(normalize(product.brand)==='purina'&&normalize(product.line)==='excellent'){
    eyebrow.textContent='Purina Excellent';
    eyebrow.classList.add('product-eyebrow--excellent');
  }else{
    eyebrow.textContent=product.brand;
  }
  const title=document.createElement('h3');
  title.textContent=displayName(product);
  const details=document.createElement('div');
  details.className='product-details';
  details.append(createChip(categoryLabels[product.category]||humanize(product.category)));
  asArray(product.species).forEach(species=>details.append(createChip(speciesLabels[species]||humanize(species))));
  body.append(eyebrow,title,details);

  const descriptionText=productDescription(product);
  if(descriptionText){
    const description=document.createElement('p');
    description.className='product-description';
    description.textContent=descriptionText;
    body.append(description);
  }

  const choice=document.createElement('div');
  choice.className='product-choice';
  let variantSelect=null;
  let presentation=null;
  if(variants.length>1){
    const control=document.createElement('label');
    control.className='variant-control';
    const caption=document.createElement('span');
    caption.textContent='Presentación o variante';
    variantSelect=document.createElement('select');
    variantSelect.setAttribute('aria-label',`Presentación de ${product.brand} ${product.name}`);
    variants.forEach((variant,index)=>variantSelect.add(new Option(variantLabel(variant),String(index))));
    variantSelect.value=String(Math.max(variants.indexOf(selectedVariant),0));
    control.append(caption,variantSelect);
    choice.append(control);
  }else if(selectedVariant){
    presentation=document.createElement('p');
    presentation.className='variant-summary';
    choice.append(presentation);
  }else{
    const noVariant=document.createElement('p');
    noVariant.className='variant-summary is-empty';
    noVariant.setAttribute('aria-hidden','true');
    choice.append(noVariant);
  }
  body.append(choice);

  const price=document.createElement('p');
  price.className='product-price';
  price.setAttribute('aria-live','polite');
  const review=document.createElement('p');
  review.className='review-note';
  review.textContent='Precio pendiente de revisión';
  const button=document.createElement('button');
  button.className='btn product-whatsapp';
  button.type='button';
  button.textContent='Consultar por WhatsApp';
  const purchase=document.createElement('div');
  purchase.className='product-purchase';
  purchase.append(price,review,button);
  body.append(purchase);

  function updateVariant(){
    const retail=selectedVariant?.retailPrice;
    const hasPrice=Number.isFinite(retail?.amount);
    price.textContent=hasPrice?formatPrice(retail.amount,retail.currency||'ARS'):'Consultar precio';
    price.classList.toggle('is-query',!hasPrice);
    if(presentation)presentation.textContent=variantLabel(selectedVariant);
    review.hidden=product.reviewStatus!=='price-review'&&selectedVariant?.reviewStatus!=='price-review';
    button.dataset.message=[
      `Quisiera consultar por ${product.brand} ${displayName(product)}`,
      selectedVariant?variantLabel(selectedVariant):null,
      hasPrice?formatPrice(retail.amount,retail.currency||'ARS'):null
    ].filter(Boolean).join(' · ')+'.';
  }

  variantSelect?.addEventListener('change',()=>{
    selectedVariant=variants[Number(variantSelect.value)]||variants[0];
    updateVariant();
  });
  button.addEventListener('click',()=>{
    document.getElementById('message').value=button.dataset.message;
    document.getElementById('contacto').scrollIntoView({behavior:'smooth'});
    window.setTimeout(()=>document.getElementById('name').focus(),450);
  });
  card.addEventListener('click',event=>{
    if(event.target.closest('button, select, label, input, a'))return;
    openProductModal(product,selectedVariant);
  });
  card.addEventListener('keydown',event=>{
    if((event.key==='Enter'||event.key===' ')&&!event.target.closest('button, select, label, input, a')){
      event.preventDefault();
      openProductModal(product,selectedVariant);
    }
  });
  card.tabIndex=0;
  card.setAttribute('role','group');
  card.setAttribute('aria-label',`Ver detalle de ${product.brand} ${displayName(product)}`);

  updateVariant();
  card.append(media,body);
  return card;
}

const productModal={
  dialog:document.getElementById('productModal'),
  content:document.getElementById('productModalContent'),
  close:document.getElementById('closeProductModal')
};

function openProductModal(product,initialVariant){
  if(!productModal.dialog||!productModal.content)return;
  const variants=asArray(product.variants);
  let variant=initialVariant||variants[0]||null;
  const wrapper=document.createElement('div');
  wrapper.className='product-modal__content';
  const media=document.createElement('div');
  media.className='product-modal__media';
  const copy=document.createElement('div');
  copy.className='product-modal__copy';
  const brand=document.createElement('p');
  brand.className='product-eyebrow';
  brand.textContent=product.line?`${product.brand} · ${product.line}`:product.brand;
  const title=document.createElement('h2');
  title.id='productModalTitle';
  title.textContent=displayName(product);
  const details=document.createElement('div');
  details.className='product-details';
  details.append(createChip(categoryLabels[product.category]||humanize(product.category)));
  asArray(product.species).forEach(species=>details.append(createChip(speciesLabels[species]||humanize(species))));
  copy.append(brand,title,details);

  const descriptionText=productDescription(product);
  if(descriptionText){
    const description=document.createElement('p');
    description.className='product-modal__description';
    description.textContent=descriptionText;
    copy.append(description);
  }

  let variantSelect=null;
  if(variants.length>1){
    const control=document.createElement('label');
    control.className='variant-control';
    const caption=document.createElement('span');
    caption.textContent='Presentación o variante';
    variantSelect=document.createElement('select');
    variantSelect.setAttribute('aria-label',`Presentación de ${product.brand} ${displayName(product)}`);
    variants.forEach((item,index)=>variantSelect.add(new Option(variantLabel(item),String(index))));
    variantSelect.value=String(Math.max(variants.indexOf(variant),0));
    control.append(caption,variantSelect);
    copy.append(control);
  }

  const price=document.createElement('p');
  price.className='product-price';
  const button=document.createElement('button');
  button.className='btn product-whatsapp';
  button.type='button';
  button.textContent='Consultar por WhatsApp';
  copy.append(price,button);

  function renderVariant(){
    const imagePath=productImagePath(product,variant);
    media.replaceChildren();
    if(imagePath){
      const image=document.createElement('img');
      image.src=imagePath;
      image.alt=`${product.brand} ${displayName(product)}`;
      media.append(image);
    }else{
      media.append(buildPlaceholder('Foto próximamente'));
    }
    const retail=variant?.retailPrice;
    const hasPrice=Number.isFinite(retail?.amount);
    price.textContent=hasPrice?formatPrice(retail.amount,retail.currency||'ARS'):'Consultar precio';
    price.classList.toggle('is-query',!hasPrice);
    button.dataset.message=[
      `Quisiera consultar por ${product.brand} ${displayName(product)}`,
      variant?variantLabel(variant):null,
      hasPrice?formatPrice(retail.amount,retail.currency||'ARS'):null
    ].filter(Boolean).join(' · ')+'.';
  }

  variantSelect?.addEventListener('change',()=>{
    variant=variants[Number(variantSelect.value)]||variants[0];
    renderVariant();
  });
  button.addEventListener('click',()=>{
    productModal.dialog.close();
    document.getElementById('message').value=button.dataset.message;
    document.getElementById('contacto').scrollIntoView({behavior:'smooth'});
    window.setTimeout(()=>document.getElementById('name').focus(),450);
  });

  renderVariant();
  wrapper.append(media,copy);
  productModal.content.replaceChildren(wrapper);
  productModal.dialog.showModal();
}

productModal.close?.addEventListener('click',()=>productModal.dialog.close());
productModal.dialog?.addEventListener('click',event=>{
  if(event.target===productModal.dialog)productModal.dialog.close();
});

function activeFilters(){
  return {
    search:normalize(catalog.search.value),
    category:catalog.category.value,
    brand:catalog.brand.value,
    species:catalog.species.value
  };
}

function productMinPrice(product){
  const amounts=asArray(product.variants).map(variant=>variant?.retailPrice?.amount).filter(Number.isFinite);
  return amounts.length?Math.min(...amounts):null;
}

function sortProducts(products,sortValue){
  const sorted=[...products];
  if(sortValue==='name-asc'){
    sorted.sort((a,b)=>displayName(a).localeCompare(displayName(b),'es'));
  }else if(sortValue==='price-asc'||sortValue==='price-desc'){
    const direction=sortValue==='price-asc'?1:-1;
    sorted.sort((a,b)=>{
      const priceA=productMinPrice(a),priceB=productMinPrice(b);
      if(priceA===null&&priceB===null)return 0;
      if(priceA===null)return 1;
      if(priceB===null)return -1;
      return (priceA-priceB)*direction;
    });
  }
  return sorted;
}

function renderActiveChips(filters){
  if(!catalog.chips)return;
  const chips=[];
  if(filters.search)chips.push({key:'search',label:`"${catalog.search.value.trim()}"`});
  if(filters.category)chips.push({key:'category',label:categoryLabels[filters.category]||humanize(filters.category)});
  if(filters.brand)chips.push({key:'brand',label:filters.brand});
  if(filters.species)chips.push({key:'species',label:speciesLabels[filters.species]||humanize(filters.species)});
  catalog.chips.hidden=chips.length===0;
  catalog.chips.replaceChildren(...chips.map(chip=>{
    const button=document.createElement('button');
    button.type='button';
    button.className='filter-chip';
    button.dataset.chipKey=chip.key;
    button.innerHTML=`<span>${chip.label}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>`;
    button.setAttribute('aria-label',`Quitar filtro ${chip.label}`);
    return button;
  }));
}

catalog.chips?.addEventListener('click',event=>{
  const button=event.target.closest('[data-chip-key]');
  if(!button)return;
  const key=button.dataset.chipKey;
  if(key==='search')catalog.search.value='';
  else if(key==='category')catalog.category.value='';
  else if(key==='brand')catalog.brand.value='';
  else if(key==='species')catalog.species.value='';
  renderCatalog();
});

function renderCatalog(){
  const filters=activeFilters();
  const terms=filters.search.split(/\s+/).filter(Boolean);
  const products=catalog.products.filter(product=>{
    const haystack=product.searchIndex;
    return terms.every(term=>haystack.includes(term))
      &&(!filters.category||product.category===filters.category)
      &&(!filters.brand||product.brand===filters.brand)
      &&(!filters.species||asArray(product.species).includes(filters.species));
  });
  const sorted=sortProducts(products,catalog.sort?.value||'relevance');

  catalog.grid.replaceChildren(...sorted.map(createProductCard));
  catalog.count.textContent=sorted.length===1?'1 producto encontrado':`${sorted.length} productos encontrados`;
  catalog.empty.hidden=sorted.length!==0;
  catalog.error.hidden=true;
  catalog.clear.hidden=!Object.values(filters).some(Boolean);
  renderActiveChips(filters);
}

function clearCatalogFilters(){
  catalog.search.value='';
  catalog.category.value='';
  catalog.brand.value='';
  catalog.species.value='';
  renderCatalog();
  catalog.search.focus();
}

async function loadCatalog(){
  if(!catalog.grid)return;
  catalog.request?.abort();
  catalog.request=new AbortController();
  catalog.grid.setAttribute('aria-busy','true');
  catalog.error.hidden=true;
  catalog.empty.hidden=true;
  catalog.count.textContent='Cargando catálogo…';
  catalog.grid.innerHTML='<div class="catalog-loading"><span></span><b>Preparando productos</b></div>';
  [catalog.category,catalog.brand,catalog.species].forEach(select=>select.disabled=true);

  try{
    const response=await fetch(new URL('data/products.json',document.baseURI),{signal:catalog.request.signal,cache:'no-store'});
    if(!response.ok)throw new Error(`Respuesta HTTP ${response.status}`);
    const data=await response.json();
    if(!Array.isArray(data.products))throw new Error('El archivo no contiene una colección products válida');
    catalog.products=data.products
      .filter(product=>normalize(product.brand)!=='cali')
      .map(product=>({...product,searchIndex:searchableText(product)}));
    setFilterOptions(catalog.category,uniqueSorted(catalog.products.map(product=>product.category)),value=>categoryLabels[value]||humanize(value));
    setFilterOptions(catalog.brand,uniqueSorted(catalog.products.map(product=>product.brand)),value=>value);
    setFilterOptions(catalog.species,uniqueSorted(catalog.products.flatMap(product=>asArray(product.species))),value=>speciesLabels[value]||humanize(value));
    const storeStatCount=document.getElementById('storeStatCount');
    if(storeStatCount)storeStatCount.textContent=`${catalog.products.length}+ productos`;
    renderCatalog();
  }catch(error){
    if(error.name==='AbortError')return;
    console.error('No se pudo cargar el catálogo de Terranova.',error);
    catalog.products=[];
    catalog.grid.replaceChildren();
    catalog.count.textContent='Catálogo temporalmente no disponible';
    catalog.error.hidden=false;
    catalog.empty.hidden=true;
  }finally{
    catalog.grid.setAttribute('aria-busy','false');
  }
}

catalog.search?.addEventListener('input',renderCatalog);
[catalog.category,catalog.brand,catalog.species,catalog.sort].forEach(select=>select?.addEventListener('change',renderCatalog));
catalog.clear?.addEventListener('click',clearCatalogFilters);
document.querySelector('[data-clear-catalog]')?.addEventListener('click',clearCatalogFilters);
catalog.retry?.addEventListener('click',loadCatalog);
loadCatalog();

const revealItems=document.querySelectorAll('.reveal');
if('IntersectionObserver' in window){
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
    if(entry.isIntersecting){
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  }),{threshold:.12});
  revealItems.forEach(item=>observer.observe(item));
}else{
  revealItems.forEach(item=>item.classList.add('visible'));
}

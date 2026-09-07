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

  const sucursal=branch.options[branch.selectedIndex].text;
  const esPedido=orderPending&&message.startsWith('PEDIDO');
  const text=[
    esPedido
      ?`Hola Terranova, quisiera hacer un pedido en la sucursal ${sucursal}.`
      :`Hola Terranova, quisiera hacer una consulta con la sucursal ${sucursal}.`,
    '',
    `Nombre: ${name}`,
    `Teléfono: ${phone}`,
    pet?`Mascota: ${pet}`:null,
    '',
    message.includes('\n')?message:`Mensaje: ${message}`
  ].filter(value=>value!==null).join('\n');
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

// Los nombres del catálogo son fragmentos de la lista de precios ("Gato Urinario",
// "Urinary"), que sueltos no dicen qué es el producto. Para alimentos se arma un
// título con los campos ya cargados; el resto conserva su nombre original.
const needTitleLabels={
  'urinario':'Cuidado urinario',
  'cuidado urinario':'Cuidado urinario',
  'esterilizado':'Esterilizados',
  'esterilizado/castrado':'Esterilizados',
  'light':'Light',
  'control de peso':'Control de peso',
  'sobrepeso':'Control de peso',
  'piel sensible':'Piel sensible',
  'crecimiento':'Crecimiento',
  'optimo crecimiento':'Óptimo crecimiento',
  'mantenimiento':'Mantenimiento',
  'cuidado completo':'Cuidado completo',
  'razas pequenas':'Razas pequeñas',
  'razas medianas y grandes':'Razas medianas y grandes',
  'razas pequenas y medianas':'Razas pequeñas y medianas',
  'todas las razas':'Todas las razas'
};
const stageTitleLabels={cachorro:'Cachorro',gatito:'Gatito',adulto:'Adulto',senior:'Senior'};

function composedTitle(product){
  if(!normalize(product.category).startsWith('alimento'))return null;
  const species=asArray(product.species);
  if(species.length!==1)return null;
  const stageRaw=normalize(product.lifeStage).split(/[;,]/)[0].split(' ')[0];
  const stage=stageTitleLabels[stageRaw]||null;
  const needRaw=normalize(product.need).split(';')[0].trim();
  const need=needTitleLabels[needRaw]||null;
  const flavor=product.flavor?tidyLabel(product.flavor):null;
  if(!stage&&!need&&!flavor)return null;
  const subject=(stage==='Gatito'||stage==='Cachorro')
    ?stage
    :`${species[0]==='gato'?'Gato':'Perro'}${stage?` ${stage.toLocaleLowerCase('es')}`:''}`;
  const parts=[subject];
  if(need)parts.push(need);
  if(flavor)parts.push(flavor.charAt(0).toLocaleUpperCase('es')+flavor.slice(1));
  return parts.join(' · ');
}

function baseName(product){
  const name=tidyLabel(product?.name);
  const brand=String(product?.brand||'').trim();
  if(!brand)return name;
  const escaped=brand.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const stripped=name.replace(new RegExp(`(^|\\s)${escaped}(?=\\s|$)`,'gi'),'$1').replace(/\s{2,}/g,' ').trim();
  return stripped||name;
}

function displayName(product){
  return product?.displayTitle||baseName(product);
}

// Dos productos distintos no pueden terminar con el mismo título: si el compuesto
// choca con otro, ese producto se queda con su nombre original.
function assignDisplayTitles(products){
  const usados=new Map();
  products.forEach(product=>{
    const candidato=composedTitle(product);
    const clave=candidato?`${product.brand}|${product.line||''}|${candidato}`:null;
    if(candidato&&!usados.has(clave)){
      usados.set(clave,product);
      product.displayTitle=candidato;
    }else{
      product.displayTitle=baseName(product);
      if(candidato&&usados.has(clave)){
        const previo=usados.get(clave);
        previo.displayTitle=baseName(previo);
      }
    }
  });
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
    product.need?`orientado a ${(needTitleLabels[normalize(product.need).split(';')[0].trim()]||product.need).toLocaleLowerCase('es')}`:null,
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
  // La línea distingue productos que, ya compuesto el título, se llamarían igual
  // (Old Prince Equilibrium y Premium comparten varias fórmulas).
  eyebrow.textContent=product.line?`${product.brand} · ${product.line}`:product.brand;
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
  button.className='btn product-add';
  button.type='button';
  button.textContent='Agregar al pedido';
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
  }

  variantSelect?.addEventListener('change',()=>{
    selectedVariant=variants[Number(variantSelect.value)]||variants[0];
    updateVariant();
  });
  button.addEventListener('click',()=>{
    cartAdd(product,selectedVariant);
    button.classList.add('is-added');
    button.textContent='Agregado';
    window.setTimeout(()=>{
      button.classList.remove('is-added');
      button.textContent='Agregar al pedido';
    },1400);
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

const CART_STORAGE_KEY='terranova-pedido';
const cart={
  dialog:document.getElementById('cartModal'),
  list:document.getElementById('cartItems'),
  body:document.getElementById('cartBody'),
  empty:document.getElementById('cartEmpty'),
  foot:document.getElementById('cartFooter'),
  total:document.getElementById('cartTotal'),
  pending:document.getElementById('cartPending'),
  button:document.getElementById('cartButton'),
  badge:document.getElementById('cartBadge'),
  confirm:document.getElementById('confirmOrder'),
  close:document.getElementById('closeCart'),
  items:[]
};

function cartRead(){
  try{
    const raw=window.localStorage.getItem(CART_STORAGE_KEY);
    const parsed=raw?JSON.parse(raw):[];
    return Array.isArray(parsed)?parsed.filter(item=>item&&item.productId&&Number.isFinite(item.qty)&&item.qty>0):[];
  }catch(error){
    return [];
  }
}

function cartWrite(){
  try{
    window.localStorage.setItem(CART_STORAGE_KEY,JSON.stringify(cart.items));
  }catch(error){
    /* almacenamiento no disponible: el pedido vive solo en esta pestaña */
  }
}

// El carrito guarda referencias, nunca precios: el importe se relee del catálogo
// en cada render para que no quede congelado un valor viejo.
function cartResolve(){
  return cart.items.map(item=>{
    const product=catalog.products.find(entry=>entry.id===item.productId);
    if(!product)return null;
    const variants=asArray(product.variants);
    const variant=item.variantId?variants.find(entry=>entry.id===item.variantId)||null:null;
    if(item.variantId&&!variant)return null;
    const amount=variant?.retailPrice?.amount;
    const unitPrice=Number.isFinite(amount)?amount:null;
    return {
      key:item.variantId||item.productId,
      product,
      variant,
      qty:item.qty,
      unitPrice,
      currency:variant?.retailPrice?.currency||'ARS',
      lineTotal:unitPrice===null?null:unitPrice*item.qty
    };
  }).filter(Boolean);
}

function cartCount(){
  return cart.items.reduce((sum,item)=>sum+item.qty,0);
}

function cartAdd(product,variant){
  const productId=product.id;
  const variantId=variant?.id||null;
  const existing=cart.items.find(item=>item.productId===productId&&(item.variantId||null)===variantId);
  if(existing)existing.qty+=1;
  else cart.items.push({productId,variantId,qty:1});
  cartWrite();
  renderCart();
}

function cartSetQty(key,qty){
  const item=cart.items.find(entry=>(entry.variantId||entry.productId)===key);
  if(!item)return;
  if(qty<1)cart.items=cart.items.filter(entry=>entry!==item);
  else item.qty=Math.min(qty,99);
  cartWrite();
  renderCart();
}

function cartLineElement(line){
  const row=document.createElement('li');
  row.className='cart-item';
  row.dataset.key=line.key;

  const media=document.createElement('div');
  media.className='cart-item__media';
  const imagePath=productImagePath(line.product,line.variant);
  if(imagePath){
    const image=document.createElement('img');
    image.src=imagePath;
    image.alt='';
    image.loading='lazy';
    media.append(image);
  }else{
    media.classList.add('is-empty');
  }

  const info=document.createElement('div');
  info.className='cart-item__info';
  const brand=document.createElement('p');
  brand.className='cart-item__brand';
  brand.textContent=line.product.brand;
  const name=document.createElement('h3');
  name.textContent=displayName(line.product);
  info.append(brand,name);
  if(line.variant){
    const variantText=document.createElement('p');
    variantText.className='cart-item__variant';
    variantText.textContent=variantLabel(line.variant);
    info.append(variantText);
  }

  const price=document.createElement('p');
  price.className='cart-item__price';
  if(line.unitPrice===null){
    price.textContent='A confirmar';
    price.classList.add('is-query');
  }else{
    price.textContent=formatPrice(line.lineTotal,line.currency);
    if(line.qty>1){
      const unit=document.createElement('span');
      unit.textContent=` (${formatPrice(line.unitPrice,line.currency)} c/u)`;
      price.append(unit);
    }
  }
  info.append(price);

  const controls=document.createElement('div');
  controls.className='cart-item__controls';
  const stepper=document.createElement('div');
  stepper.className='cart-stepper';
  const minus=document.createElement('button');
  minus.type='button';
  minus.dataset.step='-1';
  minus.textContent='−';
  minus.setAttribute('aria-label',`Quitar una unidad de ${displayName(line.product)}`);
  const qty=document.createElement('span');
  qty.textContent=String(line.qty);
  const plus=document.createElement('button');
  plus.type='button';
  plus.dataset.step='1';
  plus.textContent='+';
  plus.setAttribute('aria-label',`Agregar una unidad de ${displayName(line.product)}`);
  stepper.append(minus,qty,plus);
  const remove=document.createElement('button');
  remove.type='button';
  remove.className='cart-remove';
  remove.dataset.remove='true';
  remove.textContent='Quitar';
  controls.append(stepper,remove);

  row.append(media,info,controls);
  return row;
}

function renderCart(){
  if(!cart.list)return;
  const lines=cartResolve();
  const count=cartCount();

  if(cart.button){
    cart.button.hidden=count===0;
    cart.badge.textContent=String(count);
    cart.button.setAttribute('aria-label',count===1?'Ver tu pedido, 1 producto':`Ver tu pedido, ${count} productos`);
  }

  cart.list.replaceChildren(...lines.map(cartLineElement));
  const hasItems=lines.length>0;
  cart.empty.hidden=hasItems;
  cart.body.hidden=!hasItems;
  cart.foot.hidden=!hasItems;

  const priced=lines.filter(line=>line.lineTotal!==null);
  const total=priced.reduce((sum,line)=>sum+line.lineTotal,0);
  // Sin ningún ítem con precio, un "$ 0,00" haría pensar que el pedido no cuesta nada.
  cart.total.textContent=priced.length?formatPrice(total,priced[0].currency||'ARS'):'A confirmar';

  const sinPrecio=lines.filter(line=>line.unitPrice===null).length;
  cart.pending.hidden=sinPrecio===0;
  if(sinPrecio>0){
    cart.pending.textContent=sinPrecio===1
      ?'1 producto queda a confirmar: te pasamos el precio por WhatsApp.'
      :`${sinPrecio} productos quedan a confirmar: te pasamos los precios por WhatsApp.`;
  }
}

function selectedOption(name){
  return document.querySelector(`input[name="${name}"]:checked`)?.value||'';
}

function buildOrderMessage(){
  const lines=cartResolve();
  if(!lines.length)return '';
  const detail=lines.map(line=>{
    const parts=[`${line.qty}x ${line.product.brand} ${displayName(line.product)}`];
    if(line.variant)parts.push(variantLabel(line.variant));
    parts.push(line.lineTotal===null?'a confirmar':formatPrice(line.lineTotal,line.currency));
    return `• ${parts.join(' · ')}`;
  });
  const priced=lines.filter(line=>line.lineTotal!==null);
  const total=priced.reduce((sum,line)=>sum+line.lineTotal,0);
  const hayPendientes=lines.length!==priced.length;
  const totalTexto=priced.length
    ?`Total${hayPendientes?' (sin los productos a confirmar)':''}: ${formatPrice(total,priced[0].currency||'ARS')}`
    :'Total: a confirmar';
  return [
    'PEDIDO',
    ...detail,
    '',
    totalTexto,
    `Entrega: ${selectedOption('delivery')}`,
    `Pago: ${selectedOption('payment')}`
  ].join('\n');
}

let orderPending=false;

cart.list?.addEventListener('click',event=>{
  const row=event.target.closest('.cart-item');
  if(!row)return;
  const key=row.dataset.key;
  const line=cartResolve().find(entry=>entry.key===key);
  if(!line)return;
  if(event.target.closest('[data-remove]'))cartSetQty(key,0);
  else{
    const step=event.target.closest('[data-step]');
    if(step)cartSetQty(key,line.qty+Number(step.dataset.step));
  }
});

cart.button?.addEventListener('click',()=>{
  renderCart();
  cart.dialog.showModal();
});
cart.close?.addEventListener('click',()=>cart.dialog.close());
cart.dialog?.addEventListener('click',event=>{
  if(event.target===cart.dialog)cart.dialog.close();
});
document.querySelector('[data-close-cart]')?.addEventListener('click',()=>cart.dialog.close());

cart.confirm?.addEventListener('click',()=>{
  const message=buildOrderMessage();
  if(!message)return;
  orderPending=true;
  cart.dialog.close();
  document.getElementById('message').value=message;
  document.getElementById('contacto').scrollIntoView({behavior:'smooth'});
  window.setTimeout(()=>document.getElementById('name').focus(),450);
});

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
  const addButton=document.createElement('button');
  addButton.className='btn product-add';
  addButton.type='button';
  addButton.textContent='Agregar al pedido';
  const button=document.createElement('button');
  button.className='btn secondary product-whatsapp';
  button.type='button';
  button.textContent='Consultar por WhatsApp';
  const actions=document.createElement('div');
  actions.className='product-modal__actions';
  actions.append(addButton,button);
  copy.append(price,actions);

  addButton.addEventListener('click',()=>{
    cartAdd(product,variant);
    addButton.classList.add('is-added');
    addButton.textContent='Agregado';
    window.setTimeout(()=>{
      addButton.classList.remove('is-added');
      addButton.textContent='Agregar al pedido';
    },1400);
  });

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
    assignDisplayTitles(catalog.products);
    setFilterOptions(catalog.category,uniqueSorted(catalog.products.map(product=>product.category)),value=>categoryLabels[value]||humanize(value));
    setFilterOptions(catalog.brand,uniqueSorted(catalog.products.map(product=>product.brand)),value=>value);
    setFilterOptions(catalog.species,uniqueSorted(catalog.products.flatMap(product=>asArray(product.species))),value=>speciesLabels[value]||humanize(value));
    const storeStatCount=document.getElementById('storeStatCount');
    if(storeStatCount)storeStatCount.textContent=`${catalog.products.length}+ productos`;
    renderCatalog();
    // El pedido guardado se restaura recién acá: sus líneas se resuelven contra
    // el catálogo, así se descarta lo que ya no exista y los precios son los vigentes.
    cart.items=cartRead();
    cart.items=cartResolve().map(line=>({productId:line.product.id,variantId:line.variant?.id||null,qty:line.qty}));
    cartWrite();
    renderCart();
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

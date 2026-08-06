const b=document.getElementById('menuBtn');
const m=document.getElementById('menu');

b?.addEventListener('click',()=>{
  m.classList.toggle('open');
  b.textContent=m.classList.contains('open')?'✕':'☰';
});

m?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
  m.classList.remove('open');
  b.textContent='☰';
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

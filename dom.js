function Dom(){




  area = createButton('צור אזור');
    area.style('font-size','24px')
    area.style('width','10%')
    area.style('height','5%')
    area.style('position','absolute')
    area.style('left','2%');
    area.style('top','78%')
    area.style('color','rgb(220,160,20)')
    area.style('background-color','rgb(10,90,180)')
    area.mouseOver(changeG)
    area.mouseOut(base)
    area.mousePressed(getCord)

    function changeG(){
    this.style('-webkit-transition','0.1s')
    this.style('border-width','2px')
    this.style('border-color','rgb(195,125,65)')
  }
    function base(){
    		this.style('-webkit-transition','0.2s')
    		this.style('border-width','0.5px')
    		this.style('border-color','rgb(195,125,65)')

  //	this.style('box-shadow','10px 10px 8px #888888')
  }
  function getCord(){

    console.log("v"+ creatArea)
    console.log(area1[index0])

area1[index0][index1] = area1[index0][0];
  var polyline = L.polyline(area1[index0], {color: 'red'}).addTo(map);

  // zoom the map to the polyline
  map.fitBounds(polyline.getBounds());
   L.simpleMapScreenshoter().addTo(map)

//index0++;
index1 = 0;
  }


}

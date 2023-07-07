"use strict";
$(() => {
    VerificarJWT();
    listadoJuguetes();
    altaJuguete();
});
function VerificarJWT() {
    let jwt = localStorage.getItem("jwt"); // se recupera dle jwt 
    $.ajax({
        type: 'GET',
        url: URL_API + "login",
        dataType: "json",
        data: {},
        headers: { 'Authorization': 'Bearer ' + jwt },
        async: true // asicronico
    })
        .done(function (obj_rta) {
        if (obj_rta.exito) {
            let usuario = obj_rta.notificacion["payload"].usuario;
            $("#nombre_usuario").html(usuario.nombre);
            alert(obj_rta.notificacion["mensaje"]);
        }
    })
        .fail(function (jqXHR, textStatus, errorThrown) {
        let retorno = JSON.parse(jqXHR.responseText);
        alert(retorno.error["mensaje"] + " - redirigiendo");
        setTimeout(() => {
            $(location).attr('href', URL_BASE + "login.html");
        }, 1500);
    });
}
function listadoJuguetes() {
    let jwt = localStorage.getItem("jwt"); // se recupera dle jwt 
    // asignarlo en tabla : 
    $("#listado_juguetes").on("click", (e) => {
        VerificarJWT();
        $.ajax({
            type: 'GET',
            url: URL_API + "listarJuguetesBD",
            dataType: "json",
            data: {},
            headers: { 'Authorization': 'Bearer ' + jwt },
            async: true // asicronico
        })
            .done(function (obj_rta) {
            if (obj_rta.exito) {
                let usuario = obj_rta.notificacion["lista_juguetes"];
                let tabla = ArmarTablaProductos(usuario);
                // asocio el evento modificar
                $('#btn-modificar').on('click', function (e) {
                    let obj_prod_string = $(this).attr("data-obj_prod");
                    let obj_prod = JSON.parse(obj_prod_string);
                    console.log("click modificar: " + obj_prod);
                });
                $("#divTablaIzq").html(tabla).show(1000);
            }
        })
            .fail(function (jqXHR, textStatus, errorThrown) {
            let retorno = JSON.parse(jqXHR.responseText);
            alert(retorno.error["mensaje"] + " - redirigiendo");
            setTimeout(() => {
                $(location).attr('href', URL_BASE + "login.html");
            }, 1500);
        });
    });
}
function ArmarTablaProductos(productos) {
    let tabla = '<table class="table table-dark table-hover">';
    tabla += '<tr><th>MARCA</th><th>PRECIO</th><th>FOTO</th><th style="width:110px">ACCIONES</th></tr>';
    if (productos.length == 0) {
        tabla += '<tr><td>---</td><td>---</td><td>---</td><td>---</td><th>---</td></tr>';
    }
    else {
        productos.forEach((prod) => {
            tabla += "<tr><td>" + prod.marca + "</td><td>" + prod.precio + "</td>" + "<td><img src='" + URL_API + "public/fotos/" + prod.path_foto + "' width='50px' height='50px'></td><th>" +
                //   "<a href='#' class='btn' data-action='modificar' data-obj_prod='"+JSON.stringify(prod)+"' title='Modificar'"+
                //  " data-toggle='modal' data-target='#ventana_modal_prod' ><span class='fas fa-edit'></span></a>"+
                // "<a href='#' class='btn' data-action='eliminar' data-obj_prod='"+JSON.stringify(prod)+"' title='Eliminar'"+
                // " data-toggle='modal' data-target='#ventana_modal_prod' ><span class='fas fa-times'></span></a>"+
                "<button type='button' id='btn-modificar' class='btn btn-primary' data-action='modificar' data-obj_prod='" + JSON.stringify(prod) + "' >Modificar</button>" +
                "<button type='button' id='btn-eliminar' class='btn btn-danger' data-action='eliminar' data-obj_prod='" + JSON.stringify(prod) + "' >Eliminar</button>" +
                "</td></tr>";
        });
    }
    tabla += "</table>";
    return tabla;
}
function altaJuguete() {
    $("#alta_juguete").on("click", (e) => {
        let tabla = `<div class='container-fluid'><br><div class="row"><div class="offset-4 col-8 text-info"><h2>JUGUETES</h2>` +
            `</div></div><div class="row"><div class="offset-4 col-3"><div class="form-bottom" style="background-color: darkcyan;">` +
            `<form role="form" action="" method="" class=""><br><div class="form-group"><div class="input-group m-2">` +
            `<div class="input-group-prepend"><span class="input-group-text fas fa-trademark"></span>` +
            `<input type="text" class="form-control" name="marca" id="txtMarca" style="width:248px;" placeholder="Marca" /></div></div></div>` +
            `<div class="form-group"><div class="input-group m-2"><div class="input-group-prepend"><span class="input-group-text fas fa-dollar-sign"></span>` +
            `<input type="text" class="form-control" name="precio" id="txtPrecio" style="width:250px;" placeholder="Precio" /></div></div></div>` +
            `<div class="form-group"><div class="input-group m-2"><div class="input-group-prepend"><span class="input-group-text fas fa-camera"></span>` +
            `<input type="file" class="form-control" name="foto" id="txtFoto" style="width:250px;" placeholder="Foto" /></div></div></div><div class="row m-2"><div class="col-6">` +
            `<button type="button" class="btn btn-success btn-block" id="btnEnviar" onclick="">Agregar</button>` +
            `</div><div class="col-6">` +
            `<button type="reset" class="btn btn-warning btn-block" id="btnEnviar">Limpiar</button>` +
            `</div></div><br></form></div></div></div></div>`;
        $("#divTablaDer").html(tabla);
    });
}
//# sourceMappingURL=principal.js.map
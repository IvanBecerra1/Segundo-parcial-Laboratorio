/// <reference path="../node_modules/@types/jquery/index.d.ts" />
/// <reference path="./otrasFunciones.ts" />

$(()=>{
    $("#btnForm").on("click", (e:any) =>{
        e.preventDefault();

        let legajo = $("#legajo").val();
        let apellido = $("#apellido").val();

        let datos : any = {};
        datos.legajo = legajo;
        datos.apellido = apellido;

        $.ajax({
            type : "POST", // metodo de como va ser la peticion
            url : URL_API + "login", // ruta 
            dataType: "json", // tipo 
            data : datos, // los datos a enviar en este caso el json con legajo y apelllido
            async : true 
        })
        .done (function (obj_ret : any ) {
            console.log(obj_ret); // la respuesta

            let alerta : string = "";

            if (obj_ret.exito) {
                localStorage.setItem("jwt", obj_ret.jwt); // guardo el jwt en el local storange

                alerta = ArmarAlert(obj_ret.mensaje + "redirigiento al principal...") // doy el mensaje

                setTimeout(()=>{
                    $(location).attr("href", URL_BASE + "principal.html"); // redirecciono la pagina, con un timeout de 2 segundos

                }, 2000)
            }

            $("#div-mensaje").html(alerta); // se establece el mensaje
        })
        .fail(function (jqXHR : any , textStatus : any , error : any) {
            let retorno = JSON.parse(jqXHR.responseText);
            let alerta : string = ArmarAlert(retorno.mensaje, "danger"); // muestro el mensaje de error
            $("#div-mensaje").html(alerta); // lo inserto en el html.
        })
    })
})

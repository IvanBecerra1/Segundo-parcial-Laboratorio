/// <reference path="../../node_modules/@types/jquery/index.d.ts" />

const URL_API : string = "http://localhost:2023/";
const URL_BASE : string = "http://localhost/lab_3/sp/src/vista/";

$(()=>{
    $("#btnEnviar").on("click", (e:any) =>{
        e.preventDefault();

        let clave = $("#clave").val();
        let correo = $("#correo").val();

        let datos : any = {};

        datos.clave = clave;
        datos.correo = correo;

        $.ajax({
            type : "POST",
            url : URL_API + "login",
            dataType: "json",
            data : datos,
            async : true
        })
        .done(function (respuesta : any) {
            console.log(respuesta);

            if (respuesta.exito){
                localStorage.setItem("jwt", respuesta.notificacion["token"]);

                
                setTimeout(()=>{
                    $(location).attr("href", URL_BASE + "principal.html"); // redirecciono la pagina, con un timeout de 2 segundos

                }, 2000)

            }
        })
        .fail(function (jqXHR : any, status : any, error : any) {
            let retorno = JSON.parse(jqXHR.responseText);
             alert(retorno.error["mensaje"]);
             console.log(retorno.error["mensaje"]);
        });
    })
})

"use strict";
/// <reference path="../node_modules/@types/jquery/index.d.ts" />
/// <reference path="./otrasFunciones.ts" />
$(() => {
    $("#btnForm").on("click", (e) => {
        e.preventDefault();
        let legajo = $("#legajo").val();
        let apellido = $("#apellido").val();
        let datos = {};
        datos.legajo = legajo;
        datos.apellido = apellido;
        $.ajax({
            type: "POST",
            url: URL_API + "login",
            dataType: "json",
            data: datos,
            async: true
        })
            .done(function (obj_ret) {
            console.log(obj_ret);
            let alerta = "";
            if (obj_ret.exito) {
                localStorage.setItem("jwt", obj_ret.jwt);
                alerta = ArmarAlert(obj_ret.mensaje + "redirigiento al principal...");
                setTimeout(() => {
                    $(location).attr("href", URL_BASE + "principal.html");
                }, 2000);
            }
            $("#div-mensaje").html(alerta);
        })
            .fail(function (jqXHR, textStatus, error) {
            let retorno = JSON.parse(jqXHR.responseText);
            let alerta = ArmarAlert(retorno.mensaje, "danger");
            $("#div-mensaje").html(alerta);
        });
    });
});
//# sourceMappingURL=funciones.js.map
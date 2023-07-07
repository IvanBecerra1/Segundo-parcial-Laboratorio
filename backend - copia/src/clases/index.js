"use strict";
const express = require('express');
const app = express();
app.set('puerto', 2023);
app.get('/', (request, response) => {
    response.send('GET - servidor NodeJS');
});
app.listen(app.get('puerto'), () => {
    console.log('Servidor corriendo sobre puerto:', app.get('puerto'));
});
//AGREGO FILE SYSTEM
const fs = require('fs');
//AGREGO JSON
app.use(express.json());
//AGREGO JWT
const jwt = require("jsonwebtoken");
//SE ESTABLECE LA CLAVE SECRETA PARA EL TOKEN
app.set("key", "becerra.ivan");
app.use(express.urlencoded({ extended: false }));
//AGREGO MULTER
const multer = require('multer');
//AGREGO MIME-TYPES
const mime = require('mime-types');
//AGREGO STORAGE
const storage = multer.diskStorage({
    destination: "../public/fotos/",
});
const upload = multer({
    storage: storage
});
//AGREGO CORS (por default aplica a http://localhost)
const cors = require("cors");
//AGREGO MW 
app.use(cors());
//DIRECTORIO DE ARCHIVOS ESTÁTICOS
app.use(express.static("../")); // UBICAR BIEN EL DIRECTORIO DE IMAGENES.
//AGREGO MYSQL y EXPRESS-MYCONNECTION
const mysql = require('mysql');
const myconn = require('express-myconnection');
const db_options = {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'jugueteria_bd'
};
app.use(myconn(mysql, db_options, 'single'));
const ERROR_DB = "Error al conectarse a la bd";
/********************************************************************* */
/********************************************* */
// VERBOS
/********************************************** */
function loginVerbo(request, response, obj) {
    let usuario = response.objeto_encontrado; // el objeto buscado del middleware
    let objMensaje = {};
    objMensaje["mensaje"] = "logeo exitoso, token creado";
    objMensaje["token"] = crearJWT(usuario, app, jwt);
    return respuesta(response, true, objMensaje, 200);
}
function loginVerboGet(request, response, obj) {
    let objMensaje = {};
    objMensaje["mensaje"] = "sesion iniciada";
    objMensaje["payload"] = response.payload;
    objMensaje["token"] = "valido";
    return respuesta(response, true, objMensaje, 200);
}
function agregarJugueteVerbo(request, response, obj) {
    let objMensaje = {};
    let archivo = request.file;
    let extension = mime.extension(archivo.mimetype);
    let jugueteRecibido = JSON.parse(request.body.juguete_json); // json que se recibe
    let soloFoto = jugueteRecibido.marca + "." + extension;
    let ubicacion = archivo.destination + jugueteRecibido.marca + "." + extension;
    fs.renameSync(archivo.path, ubicacion); // cambio el nombre.
    jugueteRecibido.path_foto = soloFoto;
    request.getConnection((error, conexion) => {
        conexion.query("INSERT INTO juguetes SET ? ", [jugueteRecibido], (error, rows) => {
            errorConexion(error);
            objMensaje["mensaje"] = "Se agrego el nuevo jugete a la base de datos";
            return respuesta(response, true, objMensaje, 200);
        });
    });
}
function listarJuguetesVerbo(request, response, obj) {
    let mensaje = {};
    request.getConnection((error, conexion) => {
        errorConexion(error);
        conexion.query("SELECT * FROM juguetes;", (error, rows) => {
            errorConexion(error);
            mensaje["lista_juguetes"] = rows;
            return respuesta(response, true, mensaje, 200);
        });
    });
}
function eliminarJugueteVerbo(request, response, obj) {
    let id = request.body.id_juguete;
    let ubicacion = "";
    let mensaje = {};
    request.getConnection((error, conexion) => {
        errorConexion(error);
        conexion.query("SELECT path_foto FROM juguetes WHERE id = ?", [id], (error, rows) => {
            errorConexion(error);
            if (rows.length > 0) {
                // estoy parado en: /clases/aqui, necesito volver un directorio anterior
                // ../fotos/ aqui fotos 
                ubicacion = "../public/fotos/" + rows[0].path_foto;
            }
        });
    });
    request.getConnection((error, conexion) => {
        conexion.query("DELETE FROM juguetes WHERE id = ? ", [id], (error, rows) => {
            borrarFoto(ubicacion);
            if (rows.affectedRows > 0) {
                mensaje["juguete"] = "se borro el juguete con el id: " + id;
                return respuesta(response, true, mensaje, 200);
            }
            mensaje["juguete"] = "no se encontro el juguete con el id: " + id;
            return respuesta(response, false, mensaje, 404);
        });
    });
}
function modificarJugueteVerbo(request, response, obj) {
    let mensaje = {};
    let archivo = request.file;
    let extension = mime.extension(archivo.mimetype);
    let jugueteRecibido = JSON.parse(request.body.juguete); // json que se recibe
    let soloFoto = jugueteRecibido.marca + "_modificado" + "." + extension;
    let ubicacion = archivo.destination + jugueteRecibido.marca + "_modificado" + "." + extension;
    let ubicacion_foto_buscar = "";
    fs.renameSync(archivo.path, ubicacion); // cambio el nombre.
    let jugueteModificado = {};
    let id = jugueteRecibido.id_juguete;
    jugueteModificado.precio = jugueteRecibido.precio;
    jugueteModificado.marca = jugueteRecibido.marca;
    jugueteModificado.path_foto = soloFoto;
    request.getConnection((error, conexion) => {
        errorConexion(error);
        conexion.query("UPDATE juguetes SET ? WHERE id = ?", [jugueteModificado, id], (error, rows) => {
            errorConexion(error);
            if (rows.affectedRows > 0) {
                mensaje["mensaje"] = "se modifco el juguete con el id: " + id;
                return respuesta(response, true, mensaje, 200);
            }
            mensaje["mensaje"] = "no se modifico el juguete, verifique el id o los datos ingresados" + id;
            return respuesta(response, false, mensaje, 404);
        });
    });
}
/********************************************* */
// MIDDLEWARE
/********************************************** */
const verificar_usuario = express.Router();
verificar_usuario.use((request, response, next) => {
    try {
        let clave = request.body.clave;
        let correo = request.body.correo;
        let obj;
        request.getConnection((error, conexion) => {
            errorConexion(error);
            conexion.query("SELECT * FROM usuarios WHERE correo = ? AND clave = ? ;", [correo, clave], (error, rows) => {
                errorConexion(error);
                obj = (rows.length == 1) ? rows[0] : null;
                if (obj == null) {
                    let objMensaje = {};
                    objMensaje["mensaje"] = "correo o clave incorrecto";
                    return respuesta(response, false, objMensaje, 401);
                }
                response.objeto_encontrado = obj;
                next(); // salto al siguiente colleable
            });
        });
    }
    catch (error) {
        let objMensaje = {};
        objMensaje["mensaje"] = "se cayo el cafe en el servidor";
        objMensaje["error"] = error;
        return respuesta(response, false, objMensaje, 401);
    }
});
const verificar_jwt = express.Router();
verificar_jwt.use((request, response, next) => {
    try {
        let mensaje = {};
        // puede venir por ambos caminos
        let token = request.headers["x-access-token"] || request.headers["authorization"];
        if (!token) {
            mensaje["mensaje"] = "el JWT es requerido";
            return respuesta(response, false, mensaje, 401);
        }
        if (token.startsWith("Bearer ")) {
            token = token.slice(7, token.length);
        }
        if (token) {
            jwt.verify(token, app.get("key"), (error, decode) => {
                if (error) {
                    mensaje["mensaje"] = "el JWT es invalido";
                    return respuesta(response, false, mensaje, 403);
                }
                response.payload = decode; // agrego el token al objeto de la respuesta.
                next(); // pasa siguiente colleable
            });
        }
    }
    catch (error) {
        let objMensaje = {};
        objMensaje["mensaje"] = "se cayo el cafe en el servidor";
        objMensaje["error"] = error;
        return respuesta(response, false, objMensaje, 401);
    }
});
const verificar_jwt_header = express.Router();
verificar_jwt_header.use((request, response, next) => {
    try {
        let mensaje = {};
        if (!request.headers.token) {
            mensaje["mensaje"] = "el JWT es requerido";
            return respuesta(response, false, mensaje, 401);
        }
        const token = request.headers.token;
        if (token) {
            jwt.verify(token, app.get("key"), (error, decode) => {
                if (error) {
                    mensaje["mensaje"] = "el JWT es invalido";
                    return respuesta(response, false, mensaje, 403);
                }
                response.jwt = decode; // agrego el token al objeto de la respuesta.
                next(); // pasa siguiente colleable
            });
        }
    }
    catch (error) {
        let objMensaje = {};
        objMensaje["mensaje"] = "se cayo el cafe en el servidor";
        objMensaje["error"] = error;
        return respuesta(response, false, objMensaje, 401);
    }
});
/********************************************** */
// RUTAS
/********************************************** */
app.post("/login", verificar_usuario, loginVerbo);
app.get("/login", verificar_jwt, loginVerboGet);
app.post("/agregarJugueteBD", verificar_jwt, upload.single("foto"), agregarJugueteVerbo);
app.get("/listarJuguetesBD", verificar_jwt, listarJuguetesVerbo);
app.delete("/toys", verificar_jwt, eliminarJugueteVerbo);
app.post("/toys", verificar_jwt, upload.single("foto"), modificarJugueteVerbo);
/********************************************** */
// CONSULTAS EN LA BASE DE DATOS --- no funciona,
/********************************************** */
function traerUnUsuario(request) {
    let clave = request.body.clave;
    let correo = request.body.correo;
    let obj;
    request.getConnection((error, conexion) => {
        errorConexion(error);
        conexion.query("SELECT * FROM usuarios WHERE correo = ? AND clave = ? ;", [correo, clave], (error, rows) => {
            errorConexion(error);
            console.log("VERIFICANDO: " + (rows.length == 1) ? rows[0] : null);
            obj = (rows.length == 1) ? rows[0] : null;
        });
    });
    return obj;
}
/**
 * FUNCIONAES COMPLEMENTARIAS
 */
function errorConexion(error) {
    if (error)
        throw ("error en conectarse en la base de datos");
}
function respuesta(response, exito, mensaje, estado) {
    let objMensaje = {};
    objMensaje["exito"] = exito;
    objMensaje[(exito) ? "notificacion" : "error"] = mensaje;
    objMensaje["estado"] = estado;
    return response.status(estado).json((objMensaje));
}
function crearJWT(usuarioObtenido, app, jwt) {
    const payload = {
        usuario: {
            id: usuarioObtenido.id,
            apellido: usuarioObtenido.apellido,
            nombre: usuarioObtenido.nombre,
            perfil: usuarioObtenido.perfil,
            correo: usuarioObtenido.correo,
            foto: usuarioObtenido.foto
        },
        alumno: {
            nombre: "ivan",
            apellido: "becerra"
        },
        dni_alumno: "43723693"
    };
    // key es la clave secreta que pusimos. 
    const token = jwt.sign(payload, app.get("key"), {
        expiresIn: "2m" // hago expirar el token en 2 miniutos
    });
    return token;
}
function borrarFoto(ubicacion) {
    try {
        if (fs.existsSync(ubicacion)) {
            fs.unlink(ubicacion, (error) => {
                console.log((error) ? "no se encontro la foto del jugador" : "la foto fue borrado");
                console.log(ubicacion);
            });
        }
        else {
            console.log("la ubicacion de la foto no existe: " + ubicacion);
        }
    }
    catch (error) {
        console.log("se produjo un error en borrar la foto: " + error);
    }
}
//# sourceMappingURL=index.js.map
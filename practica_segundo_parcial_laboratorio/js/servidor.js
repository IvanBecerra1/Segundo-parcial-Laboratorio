var express = require('express');
var app = express();
app.set('puerto', 5000);
app.get('/', function (request, response) {
    response.send('GET - servidor NodeJS');
});
//AGREGO FILE SYSTEM
var fs = require('fs');
//AGREGO JSON
app.use(express.json());
//AGREGO JWT
var jwt = require("jsonwebtoken");
//SE ESTABLECE LA CLAVE SECRETA PARA EL TOKEN
app.set("key", "cl@ve_secreta");
app.use(express.urlencoded({ extended: false }));
//AGREGO MULTER
var multer = require('multer');
//AGREGO MIME-TYPES
var mime = require('mime-types');
//AGREGO STORAGE
var storage = multer.diskStorage({
    destination: "public/fotos/",
});
var upload = multer({
    storage: storage
});
//AGREGO CORS (por default aplica a http://localhost)
var cors = require("cors");
//AGREGO MW 
app.use(cors());
//DIRECTORIO DE ARCHIVOS ESTÁTICOS
app.use(express.static("public"));
//AGREGO MYSQL y EXPRESS-MYCONNECTION
var mysql = require('mysql');
var myconn = require('express-myconnection');
var db_options = {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'productos_usuarios_node'
};
app.use(myconn(mysql, db_options, 'single'));
var ERROR_DB = "Error al conectarse a la bd";
/************************* */
/* RUTAS PARA LOS MIDDLEWARE*/
/************************* */
var verificar_jwt = express.Router();
verificar_jwt.use(function (request, response, next) {
    // puede venir por ambos caminos
    var token = request.headers["x-access-token"] || request.headers["authorization"];
    if (!token) {
        // envio la respuesta con el estado 401 y en formato Json
        response.status(401).send({ error: "El JWT es requerido" });
        return;
    }
    if (token.startsWith("Bearer ")) {
        token = token.slice(7, token.length);
    }
    if (token) {
        jwt.verify(token, app.get("key"), function (error, decode) {
            if (error)
                return response.json({
                    exito: false,
                    mensaje: "el JWT no es valido"
                });
            else
                response.jwt = decode; // agrego el token al objeto de la respuesta.
            next(); // pasa siguiente colleable
        });
    }
});
var solo_admin = express.Router();
solo_admin.use(verificar_jwt, function (request, response, next) {
    console.log("colleable: verificando si es admin");
    var usuario = response.jwt; // recupero el token con el objeto dentro de jwt 
    console.log(usuario + "......");
    if (usuario.usuario.rol == "administrador") {
        //SE INVOCA AL PRÓXIMO CALLEABLE
        next();
    }
    else {
        return response.json({
            mensaje: "NO tiene perfil de 'admin'"
        });
    }
});
var verificar_usuario = express.Router();
verificar_usuario.use(function (request, response, next) {
    var objetoBaseDatos = request.body; // conexion a la base de datos
    request.getConnection(function (error, conexion) {
        if (error)
            throw ("error a conectarse a la base de datos");
        conexion.query("select * from usuarios where legajo = ? and apellido = ? ", [objetoBaseDatos.legajo, objetoBaseDatos.apellido], function (err, rows) {
            if (error)
                throw ("error a conectarse a la base de datos");
            if (rows.length == 1) {
                response.obj_usuario = rows[0]; // Lo guardo para obtenerlo en el Login
                next(); // INVOCO AL SIGUIENTE COLLEABLE.
            }
            else {
                return response.status(401).json({
                    exito: false,
                    mensaje: "apellido o nombre incorrecto",
                    jwt: null // <==== elimino el JWT
                });
            }
        });
    });
});
/************************* */
/* RUTAS */
/************************* */
var colleable_1 = express.Router();
colleable_1.use(function (request, response, next) {
    console.log("paso por el colleable 1");
    next();
});
var colleable_2 = express.Router();
colleable_2.use(function (request, response, next) {
    console.log("paso por el colleable 2");
    next();
});
app.get("/hola", colleable_1, colleable_2, function (req, r, obj) {
    r.send("llegamos a la ruta despues de pasarp or los colleables:");
});
app.post("/login", verificar_usuario, function (request, response, obj) {
    var usuarioObtenido = response.obj_usuario;
    var payload = {
        usuario: {
            id: usuarioObtenido.id,
            apellido: usuarioObtenido.apellido,
            nombre: usuarioObtenido.nombre,
            rol: usuarioObtenido.rol
        },
        api: "producto_usuarios"
    };
    // key es la clave secreta que pusimos. 
    var token = jwt.sign(payload, app.get("key"), {
        expiresIn: "5m" // hago expirar el token en 5 miniutos
    });
    response.json({
        exito: true,
        mensaje: "JWT creado",
        jwt: token // <--- le doy los valores del token
    });
});
app.get('/verificar_token', verificar_jwt, function (request, response) {
    response.json({ exito: true, jwt: response.jwt });
});
app.get("/admin", solo_admin, function (request, response, obj) {
    response.json(response.jwt);
});
/**RUTA PARA CREAR TOKEN: NO LO UTILIZO */
app.post("/crear_token", function (request, response) {
    if ((request.body.usuario == "admin" || request.body.usuario == "user") && request.body.clave == "123456") {
        var payload = {
            exito: true,
            usuario: request.body.usuario,
            perfil: request.body.usuario == "admin" ? "administrador" : "usuario"
        };
        var token = jwt.sing(payload, app.get("key"), {
            expiresIn: "1d"
        });
        response.json({
            mensaje: "JWT creado",
            jwt: token
        });
    }
    else {
        response.json({
            mensaje: "usuario no registrado",
            jwt: null
        });
    }
});
/******************************* */
/************************* */
/* RUTAS DE CRUD */
/************************* */
//LISTAR
// LISTAR
app.get("/productos_bd", verificar_jwt, function (request, response, obj) {
    request.getConnection(function (error, conexion) {
        if (error)
            throw (ERROR_DB);
        conexion.query("select * from productos", function (error, rows) {
            if (error)
                throw ("error al realizar la consulta: ruta listar");
            // envio los objetos transformado en json
            response.send(JSON.stringify(rows));
        });
    });
});
// agregar
// el midlle ware que uso es solo admin porque es una verificacion
// en el modelo original estaba planteado con un middle ware de alta_baja
// que aun asi sigue siendo lo mismo
app.post("/productos_bd", solo_admin, upload.single("foto"), function (request, response, obj) {
    var archivo = request.file;
    var tipoExtension = mime.extension(archivo.mimetype);
    var objetoRecibido = JSON.parse(request.body.obj);
    // criterio de negocio 
    var ubicacion = archivo.destination + objetoRecibido.codigo + "." + tipoExtension;
    // uso file system
    fs.renameSync(archivo.path, ubicacion);
    objetoRecibido.path = ubicacion.split("public/")[1]; // elimino "public/" para que no se guarde en la db
    console.log(objetoRecibido);
    console.log(ubicacion);
    request.getConnection(function (error, conexion) {
        if (error)
            throw (ERROR_DB);
        /// objetoRecibido = objeto a guardar
        conexion.query("insert into productos set ?", [objetoRecibido], function (err, rows) {
            if (err) {
                console.log(err);
                throw ("Error en consulta de base de datos.");
            }
            response.send("Producto agregado a la bd.");
        });
    });
});
// modificar
// foto = igual al parametro que se va enviar
app.post("/productos_bd/modificar", solo_admin, upload.single("foto"), function (request, response, obj) {
    var archivo = request.file;
    var tipoExtension = mime.extension(archivo.mimetype);
    // objeto a modificar
    var objetoRecibido = JSON.parse(request.body.obj);
    var ubicacion = archivo.destination + objetoRecibido.codigo + "." + tipoExtension;
    fs.renameSync(archivo.path, ubicacion);
    objetoRecibido.path = ubicacion.split("public/")[1];
    var objeto_modificar = {};
    objeto_modificar.marca = objetoRecibido.marca;
    objeto_modificar.precio = objetoRecibido.precio;
    objeto_modificar.path = objetoRecibido.path;
    console.log(objeto_modificar);
    request.getConnection(function (error, conexion) {
        if (error)
            throw (ERROR_DB);
        conexion.query("update productos set ? where codigo = ?", [objeto_modificar, objetoRecibido.codigo], function (error, rows) {
            if (error)
                throw ("error en realizar la modificacion");
            response.send("productos modificado");
        });
    });
});
// eliminar
app.post("/productos_bd/eliminar", solo_admin, function (request, response, obj) {
    var objeto_eliminar = request.body;
    var ubicacion_foto = "public/";
    request.getConnection(function (error, conexion) {
        if (error)
            throw (ERROR_DB);
        conexion.query("select path from productos where codigo = ?", [objeto_eliminar.codigo], function (error, rows) {
            if (error)
                throw ("error en realizar la busqueda del path");
            ubicacion_foto += rows[0].path;
        });
    });
    request.getConnection(function (error, conexion) {
        if (error)
            throw (ERROR_DB);
        conexion.query("delete from productos where codigo = ?", [objeto_eliminar.codigo], function (error, rows) {
            fs.unlink(ubicacion_foto, function (error) {
                if (error)
                    throw (error);
                console.log(ubicacion_foto + " <=== fue borrado");
            });
            response.send("el producto fue eliminado");
        });
    });
});
/************************* */
/* ----------------- */
/************************* */
app.listen(app.get('puerto'), function () {
    console.log('Servidor corriendo sobre puerto:', app.get('puerto'));
});

package internal

import (
	"context"
	"log"
	"net/http"
	"strings"
)

const DEBUG = false

type RouteNextFn func()

type RouteHandler func(w http.ResponseWriter, r *http.Request)

type contextType string

type paramsType map[string]interface{}

const nextFnKey contextType = "nextFn"
const paramsKey contextType = "params"

const (
	IsPath       = 1
	IsPrefixPath = 2
	IsSuffixPath = 3
	IsAnyPath    = 4
)

const (
	IsMethod    = 1
	IsAnyMethod = 2
)

type Route struct {
	methodType int
	method     string
	pathType   int
	path       string
	handler    RouteHandler
}

type Router struct {
	routes []Route
}

func (s *Router) Get(path string, handlers ...RouteHandler) {
	s.Custom([]string{http.MethodGet}, []string{path}, handlers...)
}

func (s *Router) Head(path string, handlers ...RouteHandler) {
	s.Custom([]string{http.MethodHead}, []string{path}, handlers...)
}

func (s *Router) Post(path string, handlers ...RouteHandler) {
	s.Custom([]string{http.MethodPost}, []string{path}, handlers...)
}

func (s *Router) All(path string, handlers ...RouteHandler) {
	s.Custom([]string{}, []string{path}, handlers...)
}

func (s *Router) Use(handlers ...RouteHandler) {
	s.Custom([]string{}, []string{}, handlers...)
}

func (s *Router) Route(path string) *Router {
	router := NewRouter()
	s.All(path, router.ServeHTTP)
	return router
}

func (s *Router) Custom(methods []string, paths []string, handlers ...RouteHandler) {
	if len(methods) == 0 {
		methods = append(methods, "")
	}

	if len(paths) == 0 {
		paths = append(paths, "")
	}

	for _, method := range methods {
		for _, path := range paths {
			for _, handler := range handlers {
				method, methodType := getMethodType(method)
				path, pathType := getPathType(path)

				route := Route{
					methodType: methodType,
					method:     method,
					pathType:   pathType,
					path:       path,
					handler:    handler,
				}
				s.routes = append(s.routes, route)
			}
		}
	}
}

func getMethodType(method string) (string, int) {
	methodType := IsMethod
	if method == "" {
		methodType = IsAnyMethod
	}
	return method, methodType
}

func getPathType(path string) (string, int) {
	routePath := path
	pathType := IsPath
	if path == "" {
		pathType = IsAnyPath
	} else if strings.HasPrefix(path, "^") {
		pathType = IsPrefixPath
		routePath = path[1:]
	} else if strings.HasSuffix(path, "$") {
		pathType = IsSuffixPath
		routePath = path[:len(path)-1]
	}
	return routePath, pathType
}

func (s *Router) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	index := 0
	var n func()
	var rc *http.Request
	n = func() {
		for {
			if index >= len(s.routes) {
				if next, ok := r.Context().Value(nextFnKey).(func()); ok {
					next()
				}
				break
			}

			route := s.routes[index]
			index++
			isMatch := matchMethod(r, &route) && matchPath(r, &route)
			if DEBUG {
				log.Printf("Route %s %s %v\n", route.method, route.path, isMatch)
			}

			if isMatch {
				route.handler(w, rc)
				break
			}
		}
	}
	ctx := context.WithValue(r.Context(), nextFnKey, n)
	if _, ok := r.Context().Value(paramsKey).(paramsType); !ok {
		ctx = context.WithValue(ctx, paramsKey, make(paramsType))
	}
	rc = r.WithContext(ctx)
	n()
}

func SetParam[T any](r *http.Request, key string, value T) {
	m, ok := r.Context().Value(paramsKey).(paramsType)
	if ok {
		m[key] = value
	}
}

func GetParam[T any](r *http.Request, key string) (v T, ok bool) {
	if m, okP := r.Context().Value(paramsKey).(paramsType); okP {
		if u, okU := m[key]; okU {
			v, ok = u.(T)
		}
	}
	return
}

func GetNext(r *http.Request) (next func(), ok bool) {
	next, ok = r.Context().Value(nextFnKey).(func())
	return
}

func matchMethod(r *http.Request, route *Route) bool {
	isMatchMethod := false
	switch route.methodType {
	case IsAnyMethod:
		isMatchMethod = true
	case IsMethod:
		isMatchMethod = r.Method == route.method
	}
	return isMatchMethod
}

func matchPath(r *http.Request, route *Route) bool {
	isMatchPath := false
	switch route.pathType {
	case IsAnyPath:
		isMatchPath = true
	case IsPath:
		isMatchPath = r.URL.Path == route.path
	case IsPrefixPath:
		isMatchPath = strings.HasPrefix(r.URL.Path, route.path)
	case IsSuffixPath:
		isMatchPath = strings.HasSuffix(r.URL.Path, route.path)
	}
	return isMatchPath
}

func NewRouter() *Router {
	return new(Router)
}

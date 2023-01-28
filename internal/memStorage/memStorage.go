package memstorage

import "sync"

type MemStorage struct {
	keyValue map[string]interface{}
	mrw      sync.RWMutex
	ch       chan int
}

func (s *MemStorage) GetKeys(keys []string) map[string]interface{} {
	result := make(map[string]interface{})
	if keys == nil {
		s.mrw.RLock()
		result = s.keyValue
		s.mrw.RUnlock()
	} else {
		for _, key := range keys {
			if val, ok := s.GetKey(key); ok {
				result[key] = val
			}
		}
	}
	return result
}

func (s *MemStorage) GetKey(key string) (interface{}, bool) {
	s.mrw.RLock()
	defer s.mrw.RUnlock()
	val, ok := s.keyValue[key]
	return val, ok
}

func (s *MemStorage) SetObject(keyValue map[string]interface{}) error {
	for key, value := range keyValue {
		s.SetKey(key, value)
	}
	return nil
}

func (s *MemStorage) SetKey(key string, value interface{}) {
	s.mrw.Lock()
	defer s.mrw.Unlock()
	s.keyValue[key] = value
}

func (s *MemStorage) DelKeys(keys []string) error {
	for _, key := range keys {
		s.DelKey(key)
	}
	return nil
}

func (s *MemStorage) DelKey(key string) {
	s.mrw.Lock()
	defer s.mrw.Unlock()
	delete(s.keyValue, key)
}

func GetMemStorage() *MemStorage {
	storage := &MemStorage{
		ch:       make(chan int),
		keyValue: make(map[string]interface{}),
	}

	return storage
}

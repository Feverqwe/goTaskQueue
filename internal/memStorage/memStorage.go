package memstorage

type MemStorage struct {
	keyValue map[string]interface{}
	ch       chan int
}

func (s *MemStorage) GetKeys(keys []string) map[string]interface{} {
	result := make(map[string]interface{})
	if keys == nil {
		result = s.keyValue
	} else {
		for _, key := range keys {
			if val, ok := s.keyValue[key]; ok {
				result[key] = val
			}
		}
	}
	return result
}

func (s *MemStorage) SetObject(keyValue map[string]interface{}) error {
	for key, value := range keyValue {
		s.keyValue[key] = value
	}
	return nil
}
func (s *MemStorage) DelKeys(keys []string) error {
	for _, key := range keys {
		delete(s.keyValue, key)
	}
	return nil
}

func GetMemStorage() *MemStorage {
	storage := &MemStorage{
		ch:       make(chan int),
		keyValue: make(map[string]interface{}),
	}

	return storage
}

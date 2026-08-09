package logstore

const ChunkSize = 10 * 1024 * 1024

func getChunksSize(chunks []*LogChunk) (n int64) {
	for _, chunk := range chunks {
		n += int64(chunk.Len)
	}
	return n
}

func getChunkOffset(chunks []*LogChunk, off int64) (index int, chunkOffset int64) {
	for index, chunk := range chunks {
		chunkSize := int64(chunk.Len)
		if off < chunkSize {
			return index, off
		}
		off -= chunkSize
	}
	return len(chunks), 0
}

func getAvailableSize(chunk *LogChunk, cSize int) int {
	return cSize - chunk.Len
}

#ifndef MISSION_SUITE_H
#define MISSION_SUITE_H

#include <stdint.h>
#include <stdbool.h>

#define EXP1_STATIC_CAPACITY 1024
#define EXP4_QUEUE_CAPACITY 10
#define EXP4_PAYLOAD_SIZE 32
#define EXP8_HASH_SIZE 10
#define EXP6_GRAPH_NODES 5

typedef struct {
    int64_t packet_id;
    int64_t timestamp;
    float battery_status;
    int32_t payload_type;
} Exp1StaticPacket;

typedef struct {
    uint32_t packet_id;
    uint64_t timestamp;
    int32_t sensor_id;
    float measurement_value;
} Exp2DynamicPacket;

typedef struct {
    int32_t task_id;
    char task_type[32];
    int32_t priority_level;
} Exp3TaskFrame;

typedef struct {
    uint32_t timestamp;
    float battery_voltage;
    float temperature;
    uint8_t payload_data[EXP4_PAYLOAD_SIZE];
} Exp4CircularPacket;

typedef struct BSTNode {
    uint64_t timestamp;
    int32_t packet_id;
    float battery_metric;
    struct BSTNode* left;
    struct BSTNode* right;
} Exp5BSTNode;

typedef struct {
    int32_t packet_id;
    int64_t timestamp;
    char event[50];
} Exp7EventPacket;

typedef struct {
    int32_t packet_id;
    int32_t payload_data;
    int32_t status;
} Exp8HashSlot;

void exp1_init_buffer(void);
bool exp1_set_packet(int32_t index, int64_t id, int64_t ts, float battery, int32_t p_type);
bool exp1_get_packet(int32_t index, Exp1StaticPacket* out);

void exp2_init_buffer(void);
void exp2_enqueue(uint32_t id, uint64_t ts, int32_t sensor, float val);
bool exp2_dequeue(Exp2DynamicPacket* out);
uint32_t exp2_get_size(void);
void exp2_clear(void);

void exp3_init_stack(void);
bool exp3_push(int32_t id, const char* type, int32_t priority);
bool exp3_pop(Exp3TaskFrame* out);
bool exp3_peek(Exp3TaskFrame* out);
void exp3_clear(void);

void exp4_init_queue(void);
bool exp4_enqueue(uint32_t ts, float voltage, float temp, const uint8_t* payload, int32_t payload_len);
bool exp4_dequeue(Exp4CircularPacket* out);
int32_t exp4_get_count(void);
bool exp4_is_full(void);
bool exp4_is_empty(void);

void exp5_init_tree(void);
void exp5_insert(uint64_t ts, int32_t packet_id, float metric);
bool exp5_search(uint64_t ts, Exp5BSTNode* out);
int32_t exp5_inorder(Exp5BSTNode* out_arr, int32_t max_out);
void exp5_clear(void);

void exp6_init_graph(void);
void exp6_set_edge(int32_t u, int32_t v, int32_t active);
int32_t exp6_shortest_path_bfs(int32_t src, int32_t dest, int32_t* out_path);

void exp7_quicksort(Exp7EventPacket* arr, int32_t low, int32_t high);
int32_t exp7_binary_search(const Exp7EventPacket* arr, int32_t n, int64_t target_ts);

void exp8_init_table(void);
int32_t exp8_insert(int32_t key, int32_t data);
int32_t exp8_search(int32_t key, int32_t* out_data);
bool exp8_delete(int32_t key);
void exp8_get_table(Exp8HashSlot* out_slots);

#endif

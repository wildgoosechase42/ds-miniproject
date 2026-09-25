#include "mission_suite.h"
#include <stdlib.h>
#include <string.h>

static Exp1StaticPacket s_exp1_buf[EXP1_STATIC_CAPACITY];

void exp1_init_buffer(void) {
    memset(s_exp1_buf, 0, sizeof(s_exp1_buf));
}

bool exp1_set_packet(int32_t index, int64_t id, int64_t ts, float battery, int32_t p_type) {
    if (index < 0 || index >= EXP1_STATIC_CAPACITY) return false;
    s_exp1_buf[index] = (Exp1StaticPacket){id, ts, battery, p_type};
    return true;
}

bool exp1_get_packet(int32_t index, Exp1StaticPacket* out) {
    if (index < 0 || index >= EXP1_STATIC_CAPACITY || !out) return false;
    *out = s_exp1_buf[index];
    return true;
}

typedef struct Exp2Node {
    Exp2DynamicPacket packet;
    struct Exp2Node* next;
} Exp2Node;

static Exp2Node* s_exp2_head = NULL;
static Exp2Node* s_exp2_tail = NULL;
static uint32_t s_exp2_size = 0;

void exp2_init_buffer(void) {
    exp2_clear();
}

void exp2_enqueue(uint32_t id, uint64_t ts, int32_t sensor, float val) {
    Exp2Node* n = (Exp2Node*)malloc(sizeof(Exp2Node));
    if (!n) return;
    n->packet = (Exp2DynamicPacket){id, ts, sensor, val};
    n->next = NULL;
    if (!s_exp2_tail) {
        s_exp2_head = n;
        s_exp2_tail = n;
    } else {
        s_exp2_tail->next = n;
        s_exp2_tail = n;
    }
    s_exp2_size++;
}

bool exp2_dequeue(Exp2DynamicPacket* out) {
    if (!s_exp2_head || !out) return false;
    Exp2Node* temp = s_exp2_head;
    *out = temp->packet;
    s_exp2_head = s_exp2_head->next;
    if (!s_exp2_head) s_exp2_tail = NULL;
    free(temp);
    s_exp2_size--;
    return true;
}

uint32_t exp2_get_size(void) {
    return s_exp2_size;
}

void exp2_clear(void) {
    Exp2Node* curr = s_exp2_head;
    while (curr) {
        Exp2Node* nxt = curr->next;
        free(curr);
        curr = nxt;
    }
    s_exp2_head = NULL;
    s_exp2_tail = NULL;
    s_exp2_size = 0;
}

typedef struct Exp3Node {
    Exp3TaskFrame frame;
    struct Exp3Node* next;
} Exp3Node;

static Exp3Node* s_exp3_top = NULL;

void exp3_init_stack(void) {
    exp3_clear();
}

bool exp3_push(int32_t id, const char* type, int32_t priority) {
    Exp3Node* n = (Exp3Node*)malloc(sizeof(Exp3Node));
    if (!n) return false;
    n->frame.task_id = id;
    strncpy(n->frame.task_type, type ? type : "", sizeof(n->frame.task_type) - 1);
    n->frame.task_type[sizeof(n->frame.task_type) - 1] = '\0';
    n->frame.priority_level = priority;
    n->next = s_exp3_top;
    s_exp3_top = n;
    return true;
}

bool exp3_pop(Exp3TaskFrame* out) {
    if (!s_exp3_top) return false;
    Exp3Node* temp = s_exp3_top;
    if (out) *out = temp->frame;
    s_exp3_top = s_exp3_top->next;
    free(temp);
    return true;
}

bool exp3_peek(Exp3TaskFrame* out) {
    if (!s_exp3_top || !out) return false;
    *out = s_exp3_top->frame;
    return true;
}

void exp3_clear(void) {
    Exp3Node* curr = s_exp3_top;
    while (curr) {
        Exp3Node* nxt = curr->next;
        free(curr);
        curr = nxt;
    }
    s_exp3_top = NULL;
}

static Exp4CircularPacket s_exp4_buf[EXP4_QUEUE_CAPACITY];
static int32_t s_exp4_front = 0;
static int32_t s_exp4_rear = 0;
static int32_t s_exp4_count = 0;

void exp4_init_queue(void) {
    s_exp4_front = 0;
    s_exp4_rear = 0;
    s_exp4_count = 0;
    memset(s_exp4_buf, 0, sizeof(s_exp4_buf));
}

bool exp4_is_full(void) {
    return s_exp4_count == EXP4_QUEUE_CAPACITY;
}

bool exp4_is_empty(void) {
    return s_exp4_count == 0;
}

bool exp4_enqueue(uint32_t ts, float voltage, float temp, const uint8_t* payload, int32_t payload_len) {
    if (exp4_is_full()) return false;
    Exp4CircularPacket* p = &s_exp4_buf[s_exp4_rear];
    p->timestamp = ts;
    p->battery_voltage = voltage;
    p->temperature = temp;
    memset(p->payload_data, 0, EXP4_PAYLOAD_SIZE);
    if (payload && payload_len > 0) {
        int32_t cpy = payload_len > EXP4_PAYLOAD_SIZE ? EXP4_PAYLOAD_SIZE : payload_len;
        memcpy(p->payload_data, payload, cpy);
    }
    s_exp4_rear = (s_exp4_rear + 1) % EXP4_QUEUE_CAPACITY;
    s_exp4_count++;
    return true;
}

bool exp4_dequeue(Exp4CircularPacket* out) {
    if (exp4_is_empty() || !out) return false;
    *out = s_exp4_buf[s_exp4_front];
    s_exp4_front = (s_exp4_front + 1) % EXP4_QUEUE_CAPACITY;
    s_exp4_count--;
    return true;
}

int32_t exp4_get_count(void) {
    return s_exp4_count;
}

static Exp5BSTNode* s_exp5_root = NULL;

static Exp5BSTNode* bst_insert_node(Exp5BSTNode* root, uint64_t ts, int32_t packet_id, float metric) {
    if (!root) {
        Exp5BSTNode* n = (Exp5BSTNode*)malloc(sizeof(Exp5BSTNode));
        if (!n) return NULL;
        n->timestamp = ts;
        n->packet_id = packet_id;
        n->battery_metric = metric;
        n->left = NULL;
        n->right = NULL;
        return n;
    }
    if (ts < root->timestamp) {
        root->left = bst_insert_node(root->left, ts, packet_id, metric);
    } else {
        root->right = bst_insert_node(root->right, ts, packet_id, metric);
    }
    return root;
}

void exp5_init_tree(void) {
    exp5_clear();
}

void exp5_insert(uint64_t ts, int32_t packet_id, float metric) {
    s_exp5_root = bst_insert_node(s_exp5_root, ts, packet_id, metric);
}

bool exp5_search(uint64_t ts, Exp5BSTNode* out) {
    Exp5BSTNode* curr = s_exp5_root;
    while (curr) {
        if (curr->timestamp == ts) {
            if (out) *out = *curr;
            return true;
        }
        if (ts < curr->timestamp) curr = curr->left;
        else curr = curr->right;
    }
    return false;
}

static void inorder_walk(const Exp5BSTNode* root, Exp5BSTNode* out_arr, int32_t max_out, int32_t* counter) {
    if (!root || *counter >= max_out) return;
    inorder_walk(root->left, out_arr, max_out, counter);
    if (*counter < max_out) {
        out_arr[*counter] = *root;
        (*counter)++;
    }
    inorder_walk(root->right, out_arr, max_out, counter);
}

int32_t exp5_inorder(Exp5BSTNode* out_arr, int32_t max_out) {
    int32_t counter = 0;
    if (out_arr && max_out > 0) {
        inorder_walk(s_exp5_root, out_arr, max_out, &counter);
    }
    return counter;
}

static void free_tree(Exp5BSTNode* root) {
    if (!root) return;
    free_tree(root->left);
    free_tree(root->right);
    free(root);
}

void exp5_clear(void) {
    free_tree(s_exp5_root);
    s_exp5_root = NULL;
}

static int32_t s_exp6_adj[EXP6_GRAPH_NODES][EXP6_GRAPH_NODES] = {
    {0, 1, 1, 0, 0},
    {1, 0, 0, 0, 1},
    {1, 0, 0, 1, 0},
    {0, 0, 1, 0, 1},
    {0, 1, 0, 1, 0}
};

void exp6_init_graph(void) {
    int32_t base[5][5] = {
        {0, 1, 1, 0, 0},
        {1, 0, 0, 0, 1},
        {1, 0, 0, 1, 0},
        {0, 0, 1, 0, 1},
        {0, 1, 0, 1, 0}
    };
    memcpy(s_exp6_adj, base, sizeof(base));
}

void exp6_set_edge(int32_t u, int32_t v, int32_t active) {
    if (u >= 0 && u < EXP6_GRAPH_NODES && v >= 0 && v < EXP6_GRAPH_NODES) {
        s_exp6_adj[u][v] = active ? 1 : 0;
        s_exp6_adj[v][u] = active ? 1 : 0;
    }
}

int32_t exp6_shortest_path_bfs(int32_t src, int32_t dest, int32_t* out_path) {
    if (src < 0 || src >= EXP6_GRAPH_NODES || dest < 0 || dest >= EXP6_GRAPH_NODES || !out_path) return 0;
    bool visited[EXP6_GRAPH_NODES] = {false};
    int32_t parent[EXP6_GRAPH_NODES];
    for (int i = 0; i < EXP6_GRAPH_NODES; i++) parent[i] = -1;

    int32_t q[EXP6_GRAPH_NODES];
    int32_t head = 0, tail = 0;
    visited[src] = true;
    q[tail++] = src;

    bool reached = false;
    while (head < tail) {
        int32_t curr = q[head++];
        if (curr == dest) {
            reached = true;
            break;
        }
        for (int v = 0; v < EXP6_GRAPH_NODES; v++) {
            if (s_exp6_adj[curr][v] && !visited[v]) {
                visited[v] = true;
                parent[v] = curr;
                q[tail++] = v;
            }
        }
    }

    if (!reached) return 0;

    int32_t temp[EXP6_GRAPH_NODES];
    int32_t len = 0;
    for (int32_t at = dest; at != -1; at = parent[at]) {
        temp[len++] = at;
    }
    for (int i = 0; i < len; i++) {
        out_path[i] = temp[len - 1 - i];
    }
    return len;
}

static void swap_event(Exp7EventPacket* a, Exp7EventPacket* b) {
    Exp7EventPacket tmp = *a;
    *a = *b;
    *b = tmp;
}

static int32_t partition_exp7(Exp7EventPacket arr[], int32_t low, int32_t high) {
    int64_t pivot = arr[high].timestamp;
    int32_t i = low - 1;
    for (int32_t j = low; j < high; j++) {
        if (arr[j].timestamp <= pivot) {
            i++;
            swap_event(&arr[i], &arr[j]);
        }
    }
    swap_event(&arr[i + 1], &arr[high]);
    return i + 1;
}

void exp7_quicksort(Exp7EventPacket* arr, int32_t low, int32_t high) {
    if (low < high) {
        int32_t pi = partition_exp7(arr, low, high);
        exp7_quicksort(arr, low, pi - 1);
        exp7_quicksort(arr, pi + 1, high);
    }
}

int32_t exp7_binary_search(const Exp7EventPacket* arr, int32_t n, int64_t target_ts) {
    int32_t low = 0;
    int32_t high = n - 1;
    while (low <= high) {
        int32_t mid = low + (high - low) / 2;
        if (arr[mid].timestamp == target_ts) return mid;
        if (arr[mid].timestamp < target_ts) low = mid + 1;
        else high = mid - 1;
    }
    return -1;
}

static Exp8HashSlot s_exp8_table[EXP8_HASH_SIZE];

void exp8_init_table(void) {
    for (int i = 0; i < EXP8_HASH_SIZE; i++) {
        s_exp8_table[i].packet_id = -1;
        s_exp8_table[i].payload_data = 0;
        s_exp8_table[i].status = 0;
    }
}

int32_t exp8_insert(int32_t key, int32_t data) {
    int32_t idx = abs(key) % EXP8_HASH_SIZE;
    int32_t init = idx;
    do {
        if (s_exp8_table[idx].status == 0 || s_exp8_table[idx].status == -1) {
            s_exp8_table[idx].packet_id = key;
            s_exp8_table[idx].payload_data = data;
            s_exp8_table[idx].status = 1;
            return idx;
        }
        idx = (idx + 1) % EXP8_HASH_SIZE;
    } while (idx != init);
    return -1;
}

int32_t exp8_search(int32_t key, int32_t* out_data) {
    int32_t idx = abs(key) % EXP8_HASH_SIZE;
    int32_t init = idx;
    do {
        if (s_exp8_table[idx].status == 0) return -1;
        if (s_exp8_table[idx].status == 1 && s_exp8_table[idx].packet_id == key) {
            if (out_data) *out_data = s_exp8_table[idx].payload_data;
            return idx;
        }
        idx = (idx + 1) % EXP8_HASH_SIZE;
    } while (idx != init);
    return -1;
}

bool exp8_delete(int32_t key) {
    int32_t loc = exp8_search(key, NULL);
    if (loc != -1) {
        s_exp8_table[loc].status = -1;
        return true;
    }
    return false;
}

void exp8_get_table(Exp8HashSlot* out_slots) {
    if (out_slots) {
        memcpy(out_slots, s_exp8_table, sizeof(s_exp8_table));
    }
}
